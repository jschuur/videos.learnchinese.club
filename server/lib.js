import pluralize from 'pluralize';
import aqp from 'api-query-params';
import Parser from 'rss-parser';
import parseURL from 'url-parse';
import groupBy from 'group-array';

import { Channel, Video } from '/models';

import dbConnect from '/db';
import {
  batchYouTubeRequest,
  buildYouTubeVideoLink,
  buildFeedUrl,
  buildHttpResponse,
  buildHttpError,
  APIError,
  debug,
  parseAllInts
} from '/util';

import { MAX_YOUTUBE_API_SEARCH_LIMIT } from '/config';

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

// Get only the channel data we want to store from an API response
function extractChannelData({ id: channelId, snippet, contentDetails, statistics }) {
  const {
    title,
    description,
    customUrl: customURL,
    publishedAt: pubDate,
    country,
    thumbnails
  } = snippet;

  return {
    channelId,
    title,
    description,
    customURL,
    pubDate,
    country,
    thumbnails,
    statistics: parseAllInts(statistics),
    uploadsPlaylistId: contentDetails.relatedPlaylists.uploads
  };
}

// Get update details from a list of channels
export async function updateChannelInfo(channels) {
  console.log(`Loaded ${channels.length} channels for info update`);

  // https://developers.google.com/youtube/v3/docs/channels/list
  let response = await batchYouTubeRequest({
    endpoint: 'channels.list',
    part: 'snippet,statistics,contentDetails',
    ids: channels.map((c) => c.channelId)
  });

  if (response?.length) {
    try {
      response = await Channel.bulkWrite(
        response.map((channel) => {
          const channelDetails = extractChannelData(channel);

          return {
            updateOne: {
              filter: { channelId: channelDetails.channelId },
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

// Wrapper function to... get channels!
export async function getChannels() {
  return Channel.find({}).exec();
}

// Get the video data we care about from the RSS feed data
function extractVideoDataRSS({ videoId, channelId, pubDate, media }) {
  return {
    videoId,
    channelId,

    pubDate: new Date(pubDate),
    title: media['media:title'][0],
    link: buildYouTubeVideoLink(videoId),
    description: media['media:description'][0]
  };
}

// Grab recent videos via their RSS feed
export async function getLatestVideosFromRSS(channels) {
  console.log(`Looking for recent uploads via RSS feeds for ${channels.length} channels`);

  // Loop through all the channels and create a single, flattened list of recent videos
  const videos = (
    await Promise.all(
      channels.map(async (channel) => {
        let feed;
        const { uploadsPlaylistId, matchingPlaylists } = channel;

        debug(`Getting updates via RSS for ${channel.title}`);

        try {
          feed = [];
          if (matchingPlaylists?.length) {
            // For channels with playlists, grab potentially multiple feed's worth of data and flatten
            feed = (
              await Promise.all(
                matchingPlaylists.map(async (playlist) => parser.parseURL(buildFeedUrl(playlist)))
              )
            )
              .map((el) => el.items)
              .flat();
          } else if (uploadsPlaylistId) {
            // ...otherwise, use the default uploads playlist
            feed = (await parser.parseURL(buildFeedUrl(uploadsPlaylistId))).items;
          } else {
            debug(`Skipping channel ID ${channel.channelId}, no playlists defined`);
          }
        } catch (err) {
          console.warn(`Couldn't get channel uploads via RSS for ${channel.name} (${err.message})`);
        }

        // Filter channel data and add author references
        return feed.map((video) => ({ ...extractVideoDataRSS(video), author: channel._id }));
      })
    )
  ).flat();

  console.log(`Found ${videos.length} videos in RSS feeds`);

  return videos;
}

// Get the video data we care about from the API data
function extractVideoDataAPI({ snippet }) {
  const {
    resourceId: { videoId },
    channelId,
    publishedAt: pubDate,
    title,
    description
  } = snippet;

  return {
    videoId,
    channelId,
    pubDate,

    title,
    link: buildYouTubeVideoLink(videoId),
    description
  };
}

// Grab recent videos via the API feed
export async function getLatestVideosFromAPI({ channels, maxResults = 20 }) {
  console.log(`Looking for recent uploads via API for ${channels.length} channels`);

  const playlistIds = channels
    .map(({ matchingPlaylists, uploadsPlaylistId }) =>
      matchingPlaylists?.length ? matchingPlaylists : uploadsPlaylistId
    )
    .flat();

  // https://developers.google.com/youtube/v3/docs/playlistItems/list
  const response = await batchYouTubeRequest({
    endpoint: 'playlistItems.list',
    part: 'snippet',
    playlistIds,
    maxResults
  });

  // Filter channel data and add author references
  return response.map((video) => {
    return {
      ...extractVideoDataAPI(video),
      author: channels.find((channel) => channel.channelId === video.snippet.channelId)._id
    };
  });
}

// Update the stats and contentDetails for a list of videos
// TODO: Eventually call periodically, right now it's only done when a video is added
export async function updateVideos({ videos, details }) {
  console.log(`Updating ${videos.length} videos (${details ? 'with' : 'without'} details)`);

  // contentDetails like the duration are static and only to be updated once
  const part = `statistics,id${details ? ',contentDetails' : ''}`;

  // https://developers.google.com/youtube/v3/docs/videos/list
  const response = await batchYouTubeRequest({
    endpoint: 'videos.list',
    part,
    ids: videos.map((video) => video.videoId)
  });

  try {
    await Video.bulkWrite(
      response.map(({ id: videoId, statistics, contentDetails }) => ({
        updateOne: {
          filter: { videoId },
          update: {
            statistics: parseAllInts(statistics),
            contentDetails
          },
          upsert: true
        }
      }))
    );
  } catch (err) {
    throw new APIError(500, `Couldn't update channel data to database (${err.message})`);
  }
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

// Save potentially new videos that were just found in a scan for updates
export async function saveVideos(videos) {
  let response;

  try {
    response = await Video.bulkWrite(
      videos.map((video) => ({
        updateOne: {
          filter: { videoId: video.videoId },
          update: video,
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

// Actually add a channel once its ID has been determined
async function addChannelByChannelId({ channelId, playlistId }) {
  let response;

  // Get the full channel data from the YouTube API
  const [item] = await batchYouTubeRequest({
    endpoint: 'channels.list',
    part: 'snippet,contentDetails,statistics',
    ids: [channelId]
  });

  if (item) {
    const channel = extractChannelData(item);
    const { title } = channel;

    try {
      // FIXME: Avoid resetting shortTitle if channel was added twice
      channel.shortTitle = title;
      if (playlistId) channel.$addToSet = { matchingPlaylists: playlistId };

      // TODO: If we use findOneAndUpdate here, this sets the createdAt field
      response = await Channel.updateOne({ channelId }, channel, { upsert: true });
    } catch (err) {
      throw new APIError(500, `Couldn't save new channel to database (${err.message})`);
    }

    // If this is a new channel, get the latest videos via the API
    if (response.upserted) {
      // Fetch channel again from DB, so we have a channel model for the author
      const videos = await getLatestVideosFromAPI({
        channels: await Channel.find({ channelId: channel.channelId }),
        maxResults: 50
      });
      const { upsertedCount } = await saveVideos(videos);

      let status = `YouTube channel ${title} added and ${pluralize(
        'video',
        upsertedCount,
        true
      )} imported`;
      // Long channel names don't look great in a video card
      if (title?.length > 30) {
        status += ', consider shortening long channel name';
      }

      return status;
    }
    // TODO: Better message after adding a second playlist for a channel
    return `YouTube channel ${title} is already tracked`;
  }
  throw new APIError(400, `YouTube API returned no channel info for ${channelId}`);
}

// Process and incoming admin action request to add a new channel
export async function addNewChannel({ videoId, channelId, playlistId }) {
  if (videoId) {
    // Look up a video's channel first
    const [video] = await batchYouTubeRequest({
      endpoint: 'videos.list',
      part: 'snippet',
      ids: [videoId]
    });

    if (video) {
      return addChannelByChannelId({ channelId: video.snippet.channelId });
    }
    throw new APIError(400, `YouTube API returned no video info for ${videoId}`);
  } else if (channelId) {
    return addChannelByChannelId({ channelId });
  } else if (playlistId) {
    const [video] = await batchYouTubeRequest({
      endpoint: 'playlistItems.list',
      part: 'snippet',
      playlistIds: [playlistId],
      maxResults: 1
    });

    if (video) {
      return addChannelByChannelId({ channelId: video.snippet.channelId, playlistId });
    }

    throw new APIError(400, 'Unable to identify channel for this playlist');
  } else {
    throw new APIError(400, 'Did not specify channel or video ID');
  }
}

// Delete a single video via an admin action
export async function deleteVideoById(videoId) {
  try {
    const results = await Video.updateOne({ videoId }, { $set: { isDeleted: true } });

    if (results?.nModified) {
      // Also remove it from the videos array
      const video = await Video.findOne({ videoId });
      // TODO: Can I do this in middleware?
      if (video) {
        await Channel.updateOne({ _id: video.author }, { $pull: { videos: video._id } });
      }

      return `Video deleted`;
    }
    if (results?.n) {
      throw new APIError(400, 'Video already deleted');
    }
    throw new APIError(404, `Not in database`);
  } catch (err) {
    throw new APIError(err.statusCode || 500, `Couldn't delete video ${videoId} (${err.message})`);
  }
}

// Wrapper function for a GET API endpoint for channels, videos that handles search
export async function searchModelAPI({ model, event: { queryStringParameters } }) {
  let response = {};

  try {
    await dbConnect();

    // Querystring needs to be converted into a format that api-query-params can handle
    const queryStringData = queryStringParameters
      ? Object.entries(queryStringParameters)
          .map(([param, value]) => {
            return `${encodeURIComponent(param)}${value && `=${encodeURIComponent(value)}`}`;
          })
          .join('&')
      : {};
    let { filter, skip, limit = 10, sort, projection, population } = aqp(queryStringData);

    // sensible defaults
    if (limit > MAX_YOUTUBE_API_SEARCH_LIMIT) {
      limit = MAX_YOUTUBE_API_SEARCH_LIMIT;
      response.notice = `Max result size hit. Only returning first ${MAX_YOUTUBE_API_SEARCH_LIMIT} matches (use skip parameter to paginate).`;
    }
    if (!sort) {
      sort = { pubDate: -1 };
    }

    const result = await model
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort(sort)
      .select(projection)
      .populate(population)
      .exec();

    // Let's go nuts and hit the database again!
    response = {
      ...response,
      totalCount: await model.countDocuments({}),
      matchingCount: await model.countDocuments(filter),
      ...(skip && { skip }),
      ...(limit && { limit })
    };

    if (result?.length) {
      response[pluralize(model.modelName).toLowerCase()] = result;
    } else {
      response = {
        ...response,
        statusCode: 404,
        status: 'No results found for the specified criteria'
      };
    }

    return buildHttpResponse(response);
  } catch (err) {
    return buildHttpError(err);
  }
}

// Wrapper to execute a bookmarklet admin action callback after validation has been performed
export async function adminAction({ event, validate, action }) {
  try {
    await dbConnect();

    const { url, secret } = JSON.parse(event.body);

    // First pass some basic common tests
    if (secret !== process.env.ADD_URL_SECRET) throw new APIError(401, 'Unauthorized access');
    if (!url) throw new APIError(400, 'Missing URL');

    const urlData = parseURL(decodeURIComponent(url), true);

    if (!urlData) throw new APIError(400, 'Invalid URL');
    if (!urlData.hostname.match(/youtube.com$/))
      throw new APIError(400, 'No valid YouTube URL detected');

    // If it looks good so far, the validate function does action specific checks
    return buildHttpResponse({ status: await action(validate(urlData)) });
  } catch (err) {
    return buildHttpError(err);
  }
}
