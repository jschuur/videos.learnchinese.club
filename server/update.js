import mongoose from 'mongoose';

import {
  getChannels,
  getLatestVideosFromRSS,
  saveVideos,
  updateChannelInfo
} from './lib';
import { buildHttpResponse } from './util';

import './db';

export async function videos(event, context) {
  console.log(`Searching for updated videos...`);

  try {
    const channels = await getChannels();
    const videos = await getLatestVideosFromRSS(channels);
    const { upsertedCount } = await saveVideos(videos);

    mongoose.disconnect();

    return buildHttpResponse(200, "Success", {
      channels: channels.length,
      new_videos: upsertedCount
    });
  } catch(err) {
    mongoose.disconnect();

    let errMsg = `Error updating videos: ${err.message}`;
    console.error(errMsg);
    return buildHttpResponse(500, errMsg);
  }
};

export async function channels(event, context) {
  console.log(`Updating channel info...`);

  try {
    var channels = await getChannels({ skipUpdate: true });
    const { nModified, upsertedCount } = await updateChannelInfo(channels);

    mongoose.disconnect();

    return buildHttpResponse(200, 'Success', {
      channels: channels.length,
      modified: nModified,
      added: upsertedCount
    });
  } catch(err) {
    mongoose.disconnect();

    let errMsg = `Error updating channels: ${err.message}`;
    console.error(errMsg);
    return buildHttpResponse(500, errMsg);
  }
}