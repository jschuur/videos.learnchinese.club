import parse from 'url-parse';

import dbConnect from '../db';

import { buildHttpResponse, buildHttpError, APIError } from '../util';
import { addNewChannel, searchModelAPI } from '../lib';

import Channel from '../models/Channel';

export async function get(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  return searchModelAPI(Channel, event.queryStringParameters);
}

async function parseParameters(event) {
  const { url, secret } = JSON.parse(event.body);

  if(secret != process.env.ADD_URL_SECRET) throw new APIError(401, 'Unauthorized access');
  if(!url) throw new APIError(400, 'Missing URL');

  const site = parse(decodeURIComponent(url), true);
  if(!site) throw new APIError(400, 'Invalid URL');
  if(!site.hostname.match(/youtube.com$/)) throw new APIError(400, 'No valid YouTube URL detected');

  var match = site.pathname.match(/\/channel\/([^\/]*)/);
  if(match) {
    var channelId = match[1];
  } else if(site.pathname == '/watch') {
    var videoId = site.query.v;
  }

  return { channelId, videoId };
}

export async function post(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await dbConnect();

    const status = await addNewChannel(await parseParameters(event));

    return buildHttpResponse({ status });
  } catch(err) {
    return buildHttpError(err);
  }
}