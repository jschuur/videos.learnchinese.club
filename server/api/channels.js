import { Channel } from '/db/models';

import { APIError } from '/lib/util';
import { searchModelAPI } from '/search';
import { addNewChannel, adminAction } from '/admin';

export async function getChannels(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  return searchModelAPI({ event, model: Channel });
}
// Feeds channel info from YouTube URL into an admin action
function getAddChannelInfo({ pathname, query }) {
  // eslint-disable-next-line no-useless-escape
  const match = pathname.match(/\/channel\/([^\/]*)/);

  if (match?.[1]) return { channelId: match[1] };
  if (pathname === '/watch') return { videoId: query.v };
  if (pathname === '/playlist') return { playlistId: query.list };

  throw new APIError(400, `Can't identify channel from current page`);
}

// Admin action to add a new channel
export async function addChannel(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  return adminAction({ event, validate: getAddChannelInfo, action: addNewChannel });
}
