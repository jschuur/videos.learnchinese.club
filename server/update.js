import mongoose from 'mongoose';

import dbConnect from './db';
import {
  getChannels,
  getLatestVideosFromRSS,
  saveVideos,
  updateChannelInfo
} from './lib';
import { buildHttpResponse, buildHttpError } from './util';


export async function videos(event, context) {
  console.log(`Searching for updated videos...`);

  try {
    await dbConnect();

    const channels = await getChannels();
    const videos = await getLatestVideosFromRSS(channels);
    const { upsertedCount } = await saveVideos(videos);

    var response = buildHttpResponse({
      channels: channels.length,
      new_videos: upsertedCount
    });
  } catch(err) {
    var response = buildHttpError(err);
  } finally {
    mongoose.disconnect()

    return response;
  }
}

export async function channels(event, context) {
  console.log(`Updating channel info...`);

  try {
    await dbConnect();

    const channels = await getChannels({ skipUpdate: true });
    if(!channels?.length) throw new APIError(400, 'No channels found for videos update');

    const { nModified, upsertedCount } = await updateChannelInfo(channels);

    var response = buildHttpResponse({
      channels: channels.length,
      modified: nModified,
      added: upsertedCount
    });
  } catch(err) {
    var response = buildHttpError(err);
  } finally {
    mongoose.disconnect()

    return response;
  }
}