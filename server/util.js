import { google } from 'googleapis';
import chunks from 'lodash.chunk';
import chalk from 'chalk';

// Get new videos
// playlistItems.list / playlistId / one at a time / part: snippet

// Get video length
// videos.list / id / batchable / part: contentDetails

// Find deleted videos
// videos.list / id / batchable / part: id

// Get channel info
// channels.list / id / batchable / part: snippet, contendDetails, statistics

// Update video view/rating, duration
// videos.list / id / batchable / part: statistics

const MAX_BATCH_SIZE = 50;

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

export function debug(message, data = null) {
  if(process.env.DEBUG) {
    console.log((`${chalk.red('DEBUG')}: ${message}`));
    data && console.log(JSON.stringify(data, null, 2));
  }
}

export async function batchYouTubeRequest({ endpoint, ids, playlistIds, ...options}) {
  var idField = 'id';
  var batchSize = MAX_BATCH_SIZE;
  var [model, action] = endpoint.split('.');
  var apiOptions = { ...options };

  // Only the playlists endpoint can't accept batches of IDs and uses a different field name
  if(playlistIds) {
    batchSize = 1;
    idField = 'playlistId';
    ids = playlistIds;
  }

  // Loop through each batch of updates (wrap async map in Promise.all())
  return (await Promise.all(chunks(ids, batchSize).map(async chunk => {
    apiOptions[idField] = chunk.join(',');

    debug(`batchYouTubeRequest to ${endpoint}`, apiOptions);
    try {
      var response = await youtube[model][action](apiOptions);
    } catch(err) {
      throw new APIError(500, `YouTube API error calling ${endpoint} (${err.message})`);
    }

    return response.data.items;
  }))).flat();
}

export function buildYouTubeVideoLink(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function getVideoThumbnail(videoId, resolution) {
  const resolutions = {
    default: { prefix: '', width: 120, height: 90 },
    medium: { prefix: 'mq', width: 320, height: 180 },
    high: { prefix: 'hq', width: 480, height: 360 },
    standard: { prefix: 'sd', width: 640, height: 480 },
    maxres: { prefix: 'maxres', width: 1280, height: 720 },
  };

  const { prefix, width, height } = resolutions[resolution];

  return {
    url: `https://i.ytimg.com/vi/${videoId}/${prefix}default.jpg`,
    width,
    height
  };
}

export const buildFeedUrl = (channelId) => `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

export function buildHttpResponse({ statusCode = 200, status = 'Success', ...data }) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({ status, ...data })
  };
}

export function buildHttpError(err) {
  var { statusCode = 500, message: status } = err;

  if(statusCode == 200 && !status) status = 'Success';

  console.error(`Error: ${ statusCode } ${ status }`);
  return buildHttpResponse({ statusCode, status });
}

export class APIError extends Error {
  constructor(statusCode, message) {
    super(message);

    this.statusCode = statusCode;
  }
}

export function parseAllInts(data) {
  Object.keys(data).forEach(key => {
    let value = data[key];

    if (typeof value === 'object') {
      return parseAllInts(value);
    }

    if(typeof value === 'string' && !isNaN(value)) {
      data[key] = parseInt(value);
    }
  });

  return data;
}