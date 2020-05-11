import Parser from 'rss-parser';
import pluralize from 'pluralize';
import groupBy from 'group-array';

import { Channel, Video } from '/db/models';

import { extractChannelData, extractVideoDataAPI, extractVideoDataRSS } from '/lib/extract';
import { APIError, debug, buildLookupTable, parseAllInts } from '/lib/util';
import {
  buildFeedUrl,
  getChannelPlaylists,
  getYouTubeState,
  parseLiveStreamingDetails,
  youTubeChannelsList,
  youTubeVideosList,
  youTubePlaylistItems
} from '/lib/youtube';

import { RECENT_VIDEOS_CHECK_ON_UPDATE } from '/config';

// Remap some fields when importing from YouTube RSS feeds
const parser = new Parser({
  customFields: {
    item: [
      ['media:group', 'media'],
      ['yt:videoId', 'videoId'],
      ['yt:channelId', 'channelId']
    ]
  }
});

// Get update details from a list of channels
export async function updateChannelInfo(channels) {
  console.log(`Loaded ${channels.length} channels for info update`);

  // Grab all the channel details
  let response = await youTubeChannelsList({
    part: 'snippet,statistics,contentDetails',
    ids: channels.map((c) => c.channelId)
  });

  if (response?.length) {
    try {
      response = await Channel.bulkWrite(
        response.map((channel) => {
          const { channelId, ...channelDetails } = extractChannelData(channel);

          return {
            updateOne: {
              filter: { channelId },
              update: channelDetails,
              upsert: true
            }
          };
        })
      );
    } catch (err) {
      throw new APIError(500, `Couldn't update channel data to database (${err.message})`);
    }

    console.log(`Saving channel updates to database (${response.nModified} modified)`);

    return response;
  }
  throw new APIError(400, 'YouTube API returned no channel info');
}

// Grab recent videos via their RSS feed
export async function getLatestVideosFromRSS(channels) {
  const promises = [];
  const channelAuthors = buildLookupTable({ from: channels, by: 'channelId', include: 'id' });

  console.log(`Looking for recent uploads via RSS feeds for ${channels.length} channels`);

  // Go through all the channels and their playlists to get feed data
  channels.forEach((channel) => {
    debug(`Getting updates via RSS for ${channel.title}`);

    getChannelPlaylists(channel).forEach((playlist) => {
      try {
        const feed = parser.parseURL(buildFeedUrl(playlist));
        promises.push(feed);
      } catch (err) {
        console.warn(`Problem with channel RSS feed ${playlist} for ${channel.name}, skipping`);
      }
    });
  });

  // Wait for all the requests to come back and extract a flatten list of videos from the items property
  const channelFeeds = (await Promise.all(promises)).map((feed) => feed?.items || {}).flat();

  // Populate with the channel details we care about, plus author reference
  const videos = channelFeeds.map((video) => ({
    ...extractVideoDataRSS(video),
    author: channelAuthors[video.channelId]
  }));

  console.log(`Found ${videos.length} videos in RSS feeds`);

  return videos;
}

// Grab recent videos via the API feed
export async function getLatestVideosFromAPI({ channels, maxResults = 20 }) {
  console.log(`Looking for recent uploads via API for ${channels.length} channels`);

  // Get all the latest videos from the YouTube API
  const playlistIds = channels.map((channel) => getChannelPlaylists(channel)).flat();
  const response = await youTubePlaylistItems({ playlistIds, maxResults });

  // Filter channel data and add author references
  return response.map((video) => ({
    ...extractVideoDataAPI(video),
    author: channels.find(({ channelId }) => channelId === video.snippet.channelId)._id
  }));
}
// Helper for saveVideos to save all the new videos to a channel's videos array
async function addVideosToChannelVideos(videos) {
  // Add the new videos to the Channel videos array
  return Channel.bulkWrite(
    Object.entries(groupBy(videos, 'channelId')).map(([channelId, channelVideos]) => ({
      updateOne: {
        filter: { channelId },
        update: {
          $addToSet: {
            videos: {
              $each: channelVideos.map((video) => video._id)
            }
          }
        },
        upsert: true
      }
    }))
  );
}

// Get data you can only get from the API for a list of videos
// TODO: Eventually call periodically, right now it's only done when a video is added
export async function updateVideos({ videos, details }) {
  console.log(`Updating ${videos.length} videos (${details ? 'with' : 'without'} details)`);

  // Get the latest channel details from the YouTube API
  // contentDetails like the duration are static and only to be updated once
  const part = `statistics,snippet,id${details ? ',contentDetails,liveStreamingDetails' : ''}`;
  const response = await youTubeVideosList({ ids: videos.map(({ videoId }) => videoId), part });

  const videoData = buildLookupTable({ from: response, by: 'videoId', copy: [['id', 'videoId']] });

  // Generate the bulkWrite update data for all the responses
  const videoUpdates = videos.map(({ videoId }) => {
    if (videoData[videoId]) {
      const { statistics, contentDetails, liveStreamingDetails, snippet } = videoData[videoId];

      return {
        videoId,
        statistics: parseAllInts(statistics),
        contentDetails,
        youTubeState: getYouTubeState(snippet?.liveBroadcastContent),
        ...(liveStreamingDetails
          ? {
              liveStreamingDetails: parseLiveStreamingDetails(liveStreamingDetails)
            }
          : {})
      };
    }

    // Deleted videos don't turn up in the API response, so are set to 'unavailable'
    return { videoId, youTubeState: 'unavailable' };
  });

  try {
    await Video.bulkWrite(
      videoUpdates.map(({ videoId, ...update }) => ({
        updateOne: {
          filter: { videoId },
          update,
          upsert: true
        }
      }))
    );
  } catch (err) {
    throw new APIError(500, `Couldn't update video data to database (${err.message})`);
  }
}

// Save potentially new videos that were just found in a scan for updates
export async function saveVideos(videos) {
  let response;

  try {
    response = await Video.bulkWrite(
      videos.map(({ videoId, ...update }) => ({
        updateOne: {
          filter: { videoId },
          update,
          upsert: true
        }
      }))
    );
  } catch (err) {
    throw new APIError(500, `Couldn't save videos to database (${err.message})`);
  }

  const { upsertedCount, upsertedIds } = response;
  console.log(`${pluralize('new video', upsertedCount, true)} added`);

  // Grab full details for new videos and add them to the channel's videos array
  if (upsertedCount) {
    const newVideos = Object.keys(upsertedIds).map((index) => ({
      _id: upsertedIds[index]._id,
      ...videos[index]
    }));

    await updateVideos({ videos: newVideos, details: true });
    await addVideosToChannelVideos(newVideos);
  }

  return response;
}

// Looks if recent videos have been deleted or gone live
export async function checkVideoStateUpdates() {
  const promises = [];

  // Get recent videos
  const recentVideos = await Video.find(
    { isDeleted: { $ne: true } },
    { videoId: 1, youTubeState: 1 },
    {
      sort: { pubDate: -1 },
      limit: RECENT_VIDEOS_CHECK_ON_UPDATE
    }
  );

  // Grab latest state of recent videos
  const response = await youTubeVideosList({ ids: recentVideos.map(({ videoId }) => videoId) });

  // Lookup table for video data by videoId
  const videoData = buildLookupTable({
    from: response,
    by: 'videoId',
    copy: [['id', 'videoId']]
  });

  // Check for youTubeState changes (premiers) or deleted videos
  recentVideos.forEach((video) => {
    const { videoId } = video;

    // No data back means it's private/deleted, otherwise store latest premier state
    video.youTubeState = videoData[videoId]
      ? getYouTubeState(videoData[videoId]?.snippet?.liveBroadcastContent)
      : 'unavailable';

    if (video.isModified()) promises.push(video.save());
  });

  console.log(`Identified ${pluralize('video state change', promises.length, true)}`);

  return Promise.all(promises);
}
