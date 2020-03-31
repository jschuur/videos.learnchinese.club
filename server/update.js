import mongoose from 'mongoose';

import {
  getChannels,
  getLatestVideosFromRSS,
  saveVideosToDB,
  updateChannelInfo,
  getChannelsFromGoogleSheet,
  saveChannels
} from './lib';
import './db';

function buildResponse(statusCode, body) {
  return {
    statusCode,
    body: JSON.stringify(body, null, 2)
  };
}

export async function videos(event, context) {
  console.log(`Searching for updated videos...`);

  var channels = await getChannels();

  if(!channels.length) {
    console.log('No channels in the database. Seeding from Google sheet');
    channels = await getChannelsFromGoogleSheet();
    await saveChannels(channels);
    await updateChannelInfo(channels);

    channels = await getChannels();
  }

  const videos = await getLatestVideosFromRSS(channels);
  const response = await saveVideosToDB(videos);

  mongoose.disconnect();

  // TODO error handling
  return buildResponse(200, {
      message: "Success",
      channels: channels.length,
      new_videos: response.upsertedCount
    });
};

export async function channels(event, context) {
  console.log(`Updating channel info...`);

  // TODO: Also trigger spreadsheet update via flag

  var channels = await getChannels();

  // If there's an uninitialized channels collection, grab the list from the spreadsheet
  if(!channels.length) {
    console.log('No channels in the database. Seeding from Google sheet');
    channels = await getChannelsFromGoogleSheet();
    await saveChannels(channels);
  }

  const response = await updateChannelInfo(channels);

  mongoose.disconnect();

    // TODO: error handling
  return buildResponse(200, {
    status: 'Success',
    channels: channels.length,
    response
  });
};