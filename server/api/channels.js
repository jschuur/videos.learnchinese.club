import { APIError } from '/util';
import { addNewChannel, adminAction, searchModelAPI } from '/lib';

import { Channel } from '/models';

export async function getChannels(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  return searchModelAPI({ event, model: Channel });
}

function getAddChannelInfo({ pathname, query: { v, list } }) {
  let videoId, playlistId, channelId;

  // eslint-disable-next-line no-useless-escape
  const match = pathname.match(/\/channel\/([^\/]*)/);

  if (match?.[1]) {
    [, channelId] = match;
  } else if (pathname === '/watch') {
    videoId = v;
  } else if (pathname === '/playlist') {
    playlistId = list;
  } else {
    throw new APIError(400, `Can't identify channel from current page`);
  }

  return { channelId, videoId, playlistId };
}

export async function addChannel(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  return adminAction({ event, validate: getAddChannelInfo, action: addNewChannel });
}
