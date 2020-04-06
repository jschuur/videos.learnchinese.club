import dbConnect from '../db';

import Video from '../models/Video';
import { buildHttpResponse, buildHttpError } from '../util';

export async function get(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await dbConnect();

    const videos =  await Video
      .find({})
      .sort({ published_at: -1 })
      .limit(30)
      .exec();

    return buildHttpResponse({ videos });
  } catch (err) {
    return buildHttpError(err);
  }
};