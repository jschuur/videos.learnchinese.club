import dbConnect from '/db';
import { searchModelAPI } from '/lib';
import { buildHttpResponse, buildHttpError } from '/util';

import Video from '/models/Video';

export async function get(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  return searchModelAPI(Video, event.queryStringParameters);
};