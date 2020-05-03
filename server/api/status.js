import dbConnect from '/db';
import { buildHttpResponse, buildHttpError } from '/util';

import { Channel, Video } from '/models';

export async function getStatus(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await dbConnect();

    const videoCount = await Video.countDocuments();
    const channelCount = await Channel.countDocuments();

    return buildHttpResponse({ videoCount, channelCount });
  } catch (err) {
    return buildHttpError(err);
  }
}
