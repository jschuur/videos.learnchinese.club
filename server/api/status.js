import dbConnect from '../db';
import { buildHttpResponse, buildHttpError } from '../util';

import Video from '../models/Video';
import Channel from '../models/Channel';

export async function handler(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await dbConnect();

    const videoCount = await Video.countDocuments();
    const channelCount = await Channel.countDocuments()

    return buildHttpResponse({ videoCount, channelCount });
  } catch(err) {
    return buildHttpError(err);
  }
};