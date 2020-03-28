import mongoose from 'mongoose';

import Video from '../models/Video';

function buildResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(body)
  };
}

export async function handler(event, context) {
  try {
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const videos =  await Video
      .find({})
      .sort({ published_at: -1 })
      .limit(30)
      .exec();

    mongoose.disconnect();

    return buildResponse(200, { status: "Success", videos });
  } catch (err) {
    return buildResponse(500, { status: `Error: ${err.message}` });
  }
};