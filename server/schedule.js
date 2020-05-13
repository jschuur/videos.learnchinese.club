import mongoose from 'mongoose';

import dbConnect from './db/db';

import {
  getLatestVideosFromRSS,
  saveVideos,
  updateChannelInfo,
  checkVideoStateUpdates
} from '/update';
import { APIError, buildHttpResponse, buildHttpError, getChannels } from '/lib/util';

import { RECENT_VIDEOS_CHECK_ON_UPDATE, RECENT_VIDEOS_CHECK_ON_LONGTAIL } from '/config';

/** Looks for new videos and state changes in recent videos */
export async function updateVideos(event, context) {
  let channels, videos, response;

  console.log(`Searching for updated videos...`);

  try {
    await dbConnect();

    channels = await getChannels();
    videos = await getLatestVideosFromRSS(channels);
    const { upsertedCount } = await saveVideos(videos);

    // After a normal update, check a modest amount of recent videos for a state change
    await checkVideoStateUpdates(RECENT_VIDEOS_CHECK_ON_UPDATE);

    response = buildHttpResponse({
      channelCount: channels.length,
      newVideosCount: upsertedCount
    });
  } catch (err) {
    response = buildHttpError(err);
  }

  mongoose.disconnect();

  return response;
}

/** Looks for state changes in recent(ish) videos */
export async function updateVideosLongTail(event, context) {
  try {
    await dbConnect();

    // Go back further than a regular check to see if older videos have an updated state
    await checkVideoStateUpdates(RECENT_VIDEOS_CHECK_ON_LONGTAIL);
  } catch (err) {
    console.error(`Couldn't connect to database for updateVideosLongTail`);
  }

  mongoose.disconnect();
}

/** Gets updated channel details on all channels */
export async function updateChannels(event, context) {
  let channels, response;

  console.log(`Updating channel info...`);

  try {
    await dbConnect();

    channels = await getChannels();
    if (!channels?.length) throw new APIError(400, 'No channels found for videos update');

    const { nModified } = await updateChannelInfo(channels);

    // TODO: Do cronjobs need to return an response?
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
