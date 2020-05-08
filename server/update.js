import mongoose from 'mongoose';

import dbConnect from '/db';
import { getChannels, getLatestVideosFromRSS, saveVideos, updateChannelInfo } from '/lib';
import { buildHttpResponse, buildHttpError, APIError } from '/util';

export async function updateVideos(event, context) {
  let channels, videos, response;

  console.log(`Searching for updated videos...`);

  try {
    await dbConnect();

    channels = await getChannels();
    videos = await getLatestVideosFromRSS(channels);
    const { upsertedCount } = await saveVideos(videos);

    response = buildHttpResponse({
      channels: channels.length,
      new_videos: upsertedCount
    });
  } catch (err) {
    response = buildHttpError(err);
  }

  mongoose.disconnect();

  return response;
}

export async function updateChannels(event, context) {
  let channels, response;

  console.log(`Updating channel info...`);

  try {
    await dbConnect();

    channels = await getChannels();
    if (!channels?.length) throw new APIError(400, 'No channels found for videos update');

    const { nModified } = await updateChannelInfo(channels);

    response = buildHttpResponse({
      channels: channels.length,
      modified: nModified
    });
  } catch (err) {
    response = buildHttpError(err);
  }

  mongoose.disconnect();

  return response;
}
