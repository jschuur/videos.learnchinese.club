import dbConnect from '../db';
import Video from '../models/Video';
import Channel from '../models/Channel';
import { buildHttpResponse, buildHttpError } from '../util';

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