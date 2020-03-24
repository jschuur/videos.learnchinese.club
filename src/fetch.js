const Parser = require('rss-parser');
const mongoose = require('mongoose');
const AWS = require('aws-sdk');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const log = require('single-line-log').stdout;
const ellipsize = require('ellipsize');
const prettyBytes = require('pretty-bytes');

const Video = require('./Video.js');

const parser = new Parser({
  customFields: {
    item: [['media:group', 'media'], ['yt:videoId', '_id']]
  }
});

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY
});

const mode = process.env.NODE_ENV || 'development';

const feedURL = (channel_id) => `https://www.youtube.com/feeds/videos.xml?channel_id=${channel_id}`;

// Get the channel list from the Google Sheets doc
async function loadChannels() {
  console.log('Downloading channel list from Google Drive');
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
  doc.useApiKey(process.env.GOOGLE_API_KEY);
  await doc.loadInfo();

  const sheet = doc.sheetsByIndex[0]; // or use doc.sheetsById[id]
  const channels = await sheet.getRows();

  console.log(`Found ${channels.length} channels`);

  return channels;
}

// Grab recent videos via their RSS feed
async function loadVideos(channels) {
  var videos = [];

  for(let channel of channels) {
    log(`Fetching videos for ${channel.name} \r`);
    try {
      var feed = await parser.parseURL(feedURL(channel.id));

      // Distill each item down to only the data we want
      feed.items.forEach(item => {
        item.description = ellipsize(item.media['media:description'][0], 200, { truncate: false });
        item.thumbnail = item.media['media:thumbnail'][0]['$'];
        item.rating = Number(item.media['media:community'][0]['media:starRating'][0]['$']['average']);
        item.views = Number(item.media['media:community'][0]['media:statistics'][0]['$']['views']);
        item.channel_id = channel.id;
        item.published_at = item.pubDate;

        ['media', 'id', 'isoDate', 'pubDate'].forEach(k => delete item[k]);
      })

      videos.push(...feed.items);
    } catch(err) {
      log(`Unable to get data for ${channel.name} \r`);
      log.clear();
    }
  }

  log(`Found ${videos.length} videos`);
  log.clear();

  return videos.sort((a, b) => -a.published_at.localeCompare(b.published_at));
}

async function saveVideosToDB(videos) {
  try {
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  } catch (err) {
    console.error(`Couldn't connect to database: ${err.message}`);
    return;
  }

  try {
    let response = await Video.bulkWrite(videos.map(video => ({
      updateOne: {
        filter: {_id: video._id},
        update: video,
        upsert: true
      }
    })));

    console.log(`Saved to database (${response.upsertedCount} added)`);
  } catch (err) {
    console.error(`Couldn't write to the database: ${err.message}`);
  }

  mongoose.disconnect();
}

async function writeVideoJSON(data) {
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: 'chinese_language_youtube.json',
      Body: data,
      ACL: 'public-read',
      ContentType: 'json'
    };

    let response = await s3.upload(params).promise();
    console.log(`\nGenerated ${response.Location} (${prettyBytes(data.length)})`);

    return response;
  } catch (err) {
    console.error(`\nCouldn't write video list to S3: ${err.message}`);

    return err;
  }
}

(async () => {
  console.log(`Mode: ${mode}`);

  let channels = await loadChannels();
  let videos = await loadVideos(channels);
  let results = await writeVideoJSON(JSON.stringify(videos));
  await saveVideosToDB(videos);
})();