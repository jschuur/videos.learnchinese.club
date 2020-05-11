import { Video } from '/db/models';

import { adminAction, deleteVideoById } from '/admin';
import { APIError } from '/lib/util';
import { searchModelAPI } from '/search';

// API endpoint for channel data
export async function getVideos(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  return searchModelAPI({ event, model: Video });
}

// Feed videoId into an admin action
function getVideoId({ pathname, query }) {
  if (pathname === '/watch' && query.v) return query.v;

  throw new APIError(400, `Can't identify video from current page`);
}

// Admin API endpoint to mark a video as deleted
export async function deleteVideo(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  return adminAction({ event, validate: getVideoId, action: deleteVideoById });
}
