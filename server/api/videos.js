import mongoose from 'mongoose';

import '../db';

import Video from '../models/Video';
import { buildHttpResponse } from '../util';

export async function get(event, context) {
  try {
    const videos =  await Video
      .find({})
      .sort({ published_at: -1 })
      .limit(30)
      .exec();

    mongoose.disconnect();

    return buildHttpResponse(200, 'Success', { videos });
  } catch (err) {
    return buildHttpResponse(500, `Error: ${err.message}`);
  }
};