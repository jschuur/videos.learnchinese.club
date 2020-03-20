require('dotenv').config();
const Parser = require('rss-parser');
const parser = new Parser();
const AWS = require('aws-sdk');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const log = require('single-line-log').stdout;

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY
});

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
      videos.push(...feed.items);
    } catch(err) {
      log(`Unable to get data for ${channel.name} \r`);
      log.clear();
    }    
  }

  log(`Found ${videos.length} videos`);
  log.clear();

  return videos.sort((a, b) => -a.pubDate.localeCompare(b.pubDate));
}

export async function writeVideoJSON(videos) {
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: 'chinese_language_youtube.json',
      Body: JSON.stringify(videos, null, 2),
      ACL: 'public-read',
      ContentType: 'json'
    };

    let response = await s3.upload(params).promise();
    console.log(`\nGenerated ${response.Location}`);

    return response;
  } catch (err) {
    console.error(`\nCouldn't write video list to S3: ${err.message}`);

    return err;
  }
}

(async () => {
  let channels = await loadChannels();
  let videos = await loadVideos(channels);
  let results = await writeVideoJSON(videos);
})();