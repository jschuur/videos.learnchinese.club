import mongoose from 'mongoose';

import {
  getChannels,
  getLatestVideosFromRSS,
  saveVideosToDB,
  // getChannelsFromGoogleSheet,
  // saveChannels,
  updateChannelInfo
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

  const channels = await getChannels();
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

  // TODO: trigger spreadsheet update via flag
  // var channels = await getChannelsFromGoogleSheet();
  // await saveChannels(channels);

  const channels = await getChannels();
  const response = await updateChannelInfo(channels);

  mongoose.disconnect();

    // TODO: error handling
  return buildResponse(200, {
    status: 'Success',
    channels: channels.length,
    response
  });
};