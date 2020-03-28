import mongoose from 'mongoose';
import pluralize from 'pluralize';

import { getChannelsFromGoogleSheet, getLatestVideos, saveVideosToDB } from './lib';
import './db';

export async function handler(event, context) {
  console.log(`Searching for updated videos...`);

  let channels = await getChannelsFromGoogleSheet();
  let videos = await getLatestVideos(channels);
  let response = await saveVideosToDB(videos);

  mongoose.disconnect();

  // TODO handle error case
  return {
    statusCode: 200,
    body: JSON.stringify({ status: `Update found ${pluralize('new video', response.upsertedCount, true)} in ${pluralize('channels', channels.length, true)}`})
  };
};
