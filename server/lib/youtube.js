import { google } from 'googleapis';
import chunks from 'lodash.chunk';

import { APIError, debug, logMessage } from '/lib/util';

import { partQuotas, MAX_YOUTUBE_BATCH_SIZE } from '/config';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

// Batch YouTube API requests into the appropriate # of calls based on how many IDs it takes
async function batchYouTubeRequest({ endpoint, ids, playlistIds, ...options }) {
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

  const quotaCost =
    options.part.split(',').reduce((acc, part) => acc + partQuotas[part], 1) *
    Math.ceil(ids.length / batchSize);

  const message = `YouTube API quota used for ${endpoint}: ${quotaCost}`;
  logMessage({
    message,
    scope: 'batchYouTubeRequest',
    expiresIn: { days: 60 },
    metaData: { endpoint, quotaCost }
  });

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

// Get info about one more more videos
// https://developers.google.com/youtube/v3/docs/videos/list
export async function youTubeVideosList({ part = 'snippet', ...options }) {
  return batchYouTubeRequest({
    endpoint: 'videos.list',
    part,
    ...options
  });
}

// Get info about one more more channels
// https://developers.google.com/youtube/v3/docs/channels/list
export async function youTubeChannelsList({ part = 'snippet', ...options }) {
  return batchYouTubeRequest({
    endpoint: 'channels.list',
    part,
    ...options
  });
}

// Get info about a playlist (including channel uploads)
// https://developers.google.com/youtube/v3/docs/playlistItems/list
export async function youTubePlaylistItems({ part = 'snippet', ...options }) {
  return batchYouTubeRequest({
    endpoint: 'playlistItems.list',
    part,
    ...options
  });
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

// for updateVideos() to format the potential liveStreamingDetails data
export function parseLiveStreamingDetails({
  scheduledStartTime,
  actualStartTime,
  actualEndTime,
  concurrentViewers,
  activeLiveChatId
}) {
  return {
    ...(scheduledStartTime ? { scheduledStartTime: new Date(scheduledStartTime) } : {}),
    ...(actualStartTime ? { actualStartTime: new Date(actualStartTime) } : {}),
    ...(actualEndTime ? { actualEndTime: new Date(actualEndTime) } : {}),
    ...(concurrentViewers ? { concurrentViewers: parseInt(concurrentViewers, 10) } : {}),
    ...(activeLiveChatId ? { activeLiveChatId } : {})
  };
}

// Maps YouTube's state into our internal one
// TODO: This doesn't (can't without other data) get unlisted videos
export function getYouTubeState(liveBroadcastContent) {
  return liveBroadcastContent === 'none' ? 'active' : liveBroadcastContent;
}

// Get the playlists to import videos from for a channel
export function getChannelPlaylists({ uploadsPlaylistId, matchingPlaylists }) {
  if (matchingPlaylists?.length) return matchingPlaylists;

  return uploadsPlaylistId ? [uploadsPlaylistId] : [];
}
