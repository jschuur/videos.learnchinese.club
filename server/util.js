import { google } from 'googleapis';
import chunks from 'lodash.chunk';
import chalk from 'chalk';

import { MAX_YOUTUBE_BATCH_SIZE } from '/config';

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

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});
export class APIError extends Error {
  constructor(statusCode, message) {
    super(message);

    this.statusCode = statusCode;
  }
}

export function debug(message, data = null) {
  if (process.env.DEBUG) {
    console.log(`${chalk.red('DEBUG')}: ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));
  }
}

export async function batchYouTubeRequest({ endpoint, ids, playlistIds, ...options }) {
  let idField = 'id';
  let batchSize = MAX_YOUTUBE_BATCH_SIZE;
  const [model, action] = endpoint.split('.');
  const apiOptions = { ...options };
  let response;

  // Only the playlists endpoint can't accept batches of IDs and uses a different field name
  if (playlistIds) {
    batchSize = 1;
    idField = 'playlistId';
    ids = playlistIds;
  }

  // Loop through each batch of updates (wrap async map in Promise.all())
  return (
    await Promise.all(
      chunks(ids, batchSize).map(async (chunk) => {
        apiOptions[idField] = chunk.join(',');

        debug(`batchYouTubeRequest to ${endpoint}`, apiOptions);
        try {
          response = await youtube[model][action](apiOptions);
        } catch (err) {
          throw new APIError(500, `YouTube API error calling ${endpoint} (${err.message})`);
        }

        return response.data.items;
      })
    )
  ).flat();
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
    maxres: { prefix: 'maxres', width: 1280, height: 720 }
  };

  const { prefix, width, height } = resolutions[resolution];

  return {
    url: `https://i.ytimg.com/vi/${videoId}/${prefix}default.jpg`,
    width,
    height
  };
}

// Also valid: https://www.youtube.com/feeds/videos.xml?channel_id=
export const buildFeedUrl = (playlistId) =>
  `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;

export function buildHttpResponse({ statusCode = 200, status = 'Success', ...data }) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify({ status, ...data })
  };
}

export function buildHttpError(err) {
  let { statusCode = 500, message: status } = err;

  if (statusCode === 200 && !status) status = 'Success';

  console.error(`Error: ${statusCode} ${status}`);
  return buildHttpResponse({ statusCode, status });
}

export function parseAllInts(data) {
  Object.keys(data).forEach((key) => {
    let value = data[key];

    if (typeof value === 'object') {
      value = parseAllInts(value);
    }

    if (typeof value === 'string' && !Number.isNaN(Number(value))) {
      value = parseInt(value, 10);
    }

    data[key] = value;
  });

  return data;
}
