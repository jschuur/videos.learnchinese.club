import { GoogleSpreadsheet } from 'google-spreadsheet';
import ellipsize from 'ellipsize';
import prettyBytes from 'pretty-bytes';
import AWS from 'aws-sdk';
import Parser from 'rss-parser';
import { stdout as log } from 'single-line-log';

import 'db';
import Video from 'models/Video';

const parser = new Parser({
  customFields: {
    item: [['media:group', 'media'], ['yt:videoId', '_id']]
  }
});

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY
});

const feedURL = (channel_id) => `https://www.youtube.com/feeds/videos.xml?channel_id=${channel_id}`;

export async function getChannelsFromGoogleSheet() {
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
export async function getLatestVideos(channels) {
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

export async function saveVideosToDB(videos) {
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
}

export async function writeVideoJSON(data) {
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