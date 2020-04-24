import { searchModelAPI, deleteVideoById, bookmarkletAction } from '/lib';
import { APIError } from '/util';

import Video from '/models/Video';

export async function getVideos(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  return searchModelAPI(Video, event.queryStringParameters);
}

function validateBookmarkletData({ pathname, query }) {
  if (pathname === '/watch' && query.v) {
    return query.v;
  }

  throw new APIError(400, `Can't identify video from current page`);
}

export async function deleteVideo(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  return bookmarkletAction(event, validateBookmarkletData, deleteVideoById);
}
