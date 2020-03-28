import mongoose from 'mongoose';

import '../db';
import Video from '../models/Video';
import Channel from '../models/Channel';

export async function handler(event, context) {
  const videoCount = await Video.countDocuments();
  const channelCount = await Channel.countDocuments();

  mongoose.disconnect();

  return {
    statusCode: 200,
    body: JSON.stringify({
      videos: videoCount,
      channels: channelCount
    })
  };
};