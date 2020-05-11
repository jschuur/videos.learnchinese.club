import dbConnect from '/db/db';
import { Channel, Video } from '/db/models';

import { buildHttpResponse, buildHttpError } from '/lib/util';

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
