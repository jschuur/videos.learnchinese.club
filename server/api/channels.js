import { APIError } from '/util';
import { addNewChannel, bookmarkletAction, searchModelAPI } from '/lib';

import Channel from '/models/Channel';

export async function getChannels(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  return searchModelAPI(Channel, event.queryStringParameters);
}

function validateBookmarkletData(urlData) {
  let videoId, playlistId, channelId;

  // eslint-disable-next-line no-useless-escape
  const match = urlData.pathname.match(/\/channel\/([^\/]*)/);

  if (match?.[1]) {
    [, channelId] = match;
  } else if (urlData.pathname === '/watch') {
    videoId = urlData.query.v;
  } else if (urlData.pathname === '/playlist') {
    playlistId = urlData.query.list;
  } else {
    throw new APIError(400, `Can't identify channel from current page`);
  }

  return { channelId, videoId, playlistId };
}

export async function addChannel(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  return bookmarkletAction(event, validateBookmarkletData, addNewChannel);
}
