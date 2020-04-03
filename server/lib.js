import { GoogleSpreadsheet } from 'google-spreadsheet';
import pluralize from 'pluralize';

import Video from './models/Video';
import Channel from './models/Channel';

import { batchYouTubeRequest, buildYouTubeVideoLink } from './util';

export async function getChannels() {
  return await Channel.find({}).exec();
}

export async function getChannelsFromGoogleSheet() {
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
  doc.useApiKey(process.env.GOOGLE_API_KEY);
  await doc.loadInfo();

  const sheet = doc.sheetsByIndex[0]; // or use doc.sheetsById[id]
  var channels = await sheet.getRows();

  // Rename the id column, so we can use this array elsewhere
  channels = channels.map(channel => {
    let { id: _id, ...data } = channel;
    return { _id, channel_id: _id, ...data };
  });

  console.log(`Found ${channels.length} channels in Google sheet`);

  return channels;
}

// Grab recent videos via their RSS feed
export async function getLatestVideos(channels) {
  console.log(`Requesting recent uploads via API for ${channels.length} channels`);

  // In scheduled use, we should only look through the latest 10-20 videos until a better check can be done
  const MAX_RESULTS = 20;

  // https://developers.google.com/youtube/v3/docs/playlistItems/list
  const response = await batchYouTubeRequest({
    endpoint: 'playlistItems.list',
    part: 'snippet',
    playlistIds: channels.map(c => c.uploads_playlist_id),
    maxResults: MAX_RESULTS
  });

  // Extract the data we want per video
  const videos = response.map(item => (
    {
      video_id: item.snippet.resourceId.videoId,
      channel_id: item.snippet.channelId,
      published_at: item.snippet.publishedAt,

      title: item.snippet.title,
      link: buildYouTubeVideoLink(item.snippet.resourceId.videoId),
      description: item.snippet.description,
      author: item.snippet.channelTitle
    })
  );

  console.log(`Found ${videos.length} videos via API`);

  return videos;
}

export async function saveVideos(videos) {
  try {
    let response = await Video.bulkWrite(videos.map(video => ({
      updateOne: {
        filter: {_id: video.video_id},
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

export async function updateVideos(ids, { details }) {
  console.log(`Updating ${ ids.length } videos (${details ? 'with' : 'without'} details)`);

  var part = `statistics,id${details ? ',contentDetails' : ''}`;

  // https://developers.google.com/youtube/v3/docs/videos/list
  var response = await batchYouTubeRequest({
    endpoint: 'videos.list',
    part,
    ids
  });

  try {
    await Video.bulkWrite(response.map(video  => ({
      updateOne: {
        filter: { _id: video.id },
        update: {
          statistics: video.statistics,
          content_details: video.contentDetails
        },
        upsert: true
      }
    })));

  } catch (err) {
    console.error(`Couldn't update channel data to the database: ${err.message}`);

    return;
  }

  return;
}

export async function saveChannels(channels) {
  try {
    let response = await Channel.bulkWrite(channels.map((channel)  => ({
      updateOne: {
        filter: { _id: channel._id },
        update: channel,
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

  // https://developers.google.com/youtube/v3/docs/channels/list
  var response = await batchYouTubeRequest({
    endpoint: 'channels.list',
    part: 'snippet,statistics,contentDetails',
    ids: channels.map(c => c.channel_id)
  });

  // TODO: Error check response
  const channel_data = response.map(channel => {
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

    console.log(`Saving channel updates to database (${response.upsertedCount} added)`);
  } catch (err) {
    console.error(`Couldn't update channel data to the database: ${err.message}`);

    return;
  }

  return response;
}