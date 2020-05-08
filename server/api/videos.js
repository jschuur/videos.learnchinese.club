import { searchModelAPI, deleteVideoById, adminAction } from '/lib';
import { APIError } from '/util';

import { Video } from '/models';

export async function getVideos(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  return searchModelAPI({ event, model: Video });
}

function getVideoId({ pathname, query }) {
  if (pathname === '/watch' && query.v) {
    return query.v;
  }

  throw new APIError(400, `Can't identify video from current page`);
}

export async function deleteVideo(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  return adminAction({ event, validate: getVideoId, action: deleteVideoById });
}
