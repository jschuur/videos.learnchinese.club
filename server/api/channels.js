import parse from 'url-parse';

import '../db';

import { buildHttpResponse } from '../util';
import { addNewChannel } from '../lib';

function parseParameters(event) {
  return new Promise((resolve, reject) => {

    const { url, secret } = JSON.parse(event.body);
    if(secret != process.env.ADD_URL_SECRET) return reject(buildHttpResponse(401, 'Unauthorized access'));
    if(!url) return reject(buildHttpResponse(400, 'Missing URL'));

    const site = parse(decodeURIComponent(url), true);
    if(!site) return reject(buildHttpResponse(400, 'Invalid URL'));
    if(!site.hostname.match(/youtube.com$/)) return reject(buildHttpResponse(404, 'No valid YouTube URL detected'));

    var channelId, videoId;
    var match = site.pathname.match(/\/channel\/(.*)/);
    if(match) {
      channelId = match[1];
    } else if(site.pathname == '/watch') {
      videoId = site.query.v;
    }

    resolve({ channelId, videoId });
  });
}

export async function post(event, context) {
  return parseParameters(event)
  .then(async ({ channelId, videoId }) => {
    try {
      let message = await addNewChannel({ channelId, videoId });

      return buildHttpResponse(200, message);
    } catch(err) {
      return buildHttpResponse(400, `Error adding new channel: ${err}`);
    }
  })
  .catch(err => {
    return err;
  });
}