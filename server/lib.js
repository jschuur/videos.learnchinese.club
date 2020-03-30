import { GoogleSpreadsheet } from 'google-spreadsheet';
import { google } from 'googleapis';
import ellipsize from 'ellipsize';
import pluralize from 'pluralize';
import Parser from 'rss-parser';

import Video from './models/Video';
import Channel from './models/Channel';

const parser = new Parser({
  customFields: {
    item: [['media:group', 'media'], ['yt:videoId', '_id']]
  }
});

const feedURL = (channel_id) => `https://www.youtube.com/feeds/videos.xml?channel_id=${channel_id}`;

export async function getChannels() {
  return await Channel.find({}).exec();
}

export async function getChannelsFromGoogleSheet() {
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
  doc.useApiKey(process.env.GOOGLE_API_KEY);
  await doc.loadInfo();

  const sheet = doc.sheetsByIndex[0]; // or use doc.sheetsById[id]
  const channels = await sheet.getRows();

  console.log(`Found ${channels.length} channels`);

  return channels;
}

// Grab recent videos via their RSS feed
export async function getLatestVideosFromRSS(channels) {
  var videos = [];

  for(let channel of channels) {
    try {
      var feed = await parser.parseURL(feedURL(channel.channel_id));

      // Distill each item down to only the data we want
      feed.items.forEach(item => {
        item.description = ellipsize(item.media['media:description'][0], 200, { truncate: false });
        item.thumbnail = item.media['media:thumbnail'][0]['$'];
        item.rating = Number(item.media['media:community'][0]['media:starRating'][0]['$']['average']);
        item.views = Number(item.media['media:community'][0]['media:statistics'][0]['$']['views']);
        item.channel_id = channel.channel_id;
        item.published_at = item.pubDate;

        ['media', 'id', 'isoDate', 'pubDate'].forEach(k => delete item[k]);
      });

      videos.push(...feed.items);
    } catch(err) {
      console.error(`Unable to get data for ${channel.name}`);
    }
  }

  console.log(`Found ${videos.length} videos in RSS feeds`);

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

    console.log(`${pluralize('new video', response.upsertedCount, true)} added`);

    return response;
  } catch (err) {
    console.error(`Couldn't save videos to the database: ${err.message}`);
    // TODO: throw new Error()
  }
}

export async function saveChannels(channels) {
  try {
    let response = await Channel.bulkWrite(channels.map(({ id, homepage, twitter, instagram})  => ({
      updateOne: {
        filter: { _id: id },
        update: {
          _id: id,
          ...(homepage && { homepage }),
          ...(twitter && { twitter }),
          ...(instagram && { instagram })
        },
        upsert: true
      }
    })));

    console.log(`Saving new channels to database (${response.upsertedCount} added)`);
  } catch (err) {
    console.error(`Couldn't write new channel data to the database: ${err.message}`);

    return;
  }
}

export async function updateChannelInfo(channels) {
  console.log(`Loaded ${ channels.length } channels for info update`);

  const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY,
  });

  // TODO: Do in chunks (of 50?) based on API limit
  var response = await youtube.channels.list({
    part: 'snippet,statistics,contentDetails',
    id: channels.map(c => c._id).join(',')
  });

  // TODO: Error check response
  const channel_data = response.data.items.map(channel => {
    var { snippet, contentDetails, statistics } = channel;

    return {
      channel_id: channel.id,
      title: snippet.title,
      description: snippet.description,
      customURL: snippet.customUrl,
      published_at: snippet.publishedAt,
      country: snippet.country,
      thumbnails: snippet.thumbnails,
      statistics,
      uploads_playlist_id: contentDetails.relatedPlaylists.uploads,
    };
  });

  try {
    response = await Channel.bulkWrite(channel_data.map(channel  => ({
      updateOne: {
        filter: { _id: channel.channel_id },
        update: channel,
        upsert: true
      }
    })));

    console.log(`Saving new channels to database (${response.upsertedCount} added)`);
  } catch (err) {
    console.error(`Couldn't update channel data to the database: ${err.message}`);

    return;
  }

  return response;
}