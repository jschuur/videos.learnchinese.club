import { GoogleSpreadsheet } from 'google-spreadsheet';
import pluralize from 'pluralize';
import aqp from 'api-query-params';
import Parser from 'rss-parser';
import parseURL from 'url-parse';

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
      ['yt:videoId', '_id']
    ]
  }
});

// Get only the channel data we want to store from an API response
function extractChannelData(channel) {
  const { snippet, contentDetails, statistics } = channel;

  return {
    channelId: channel.id,
    title: snippet.title,
    description: snippet.description,
    customURL: snippet.customUrl,
    pubDate: snippet.publishedAt,
    country: snippet.country,
    thumbnails: snippet.thumbnails,
    statistics: parseAllInts(statistics),
    uploadsPlaylistId: contentDetails.relatedPlaylists.uploads
  };
}

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
          const data = extractChannelData(channel);

          return {
            updateOne: {
              filter: { _id: data.channelId },
              update: data,
              upsert: true
            }
          };
        })
      );
    } catch (err) {
      throw new APIError(500, `Couldn't update channel data to database (${err.message})`);
    }

    console.log(
      `Saving channel updates to database (${response.nModified} modified, ${response.upsertedCount} added)`
    );

    return response;
  }
  throw new APIError(400, 'YouTube API returned no channel info');
}

export async function getChannelsFromGoogleSheet() {
  let channels;

  try {
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
    doc.useApiKey(process.env.GOOGLE_API_KEY);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0]; // or use doc.sheetsById[id]
    channels = await sheet.getRows();
  } catch (err) {
    throw new APIError(500, `Couldn't access Google Sheet to import channels (${err.message})`);
  }

  // Rename the id column, so we can use this array elsewhere
  channels = channels.map((channel) => {
    const { id: _id, ...data } = channel;

    // Remove blank fields from the spreadsheet
    Object.keys(data).forEach((key) => {
      if (!data[key]) delete data[key];
    });

    return { _id, channelId: _id, ...data };
  });

  console.log(`Found ${channels.length} channels in Google sheet`);

  return channels;
}

export async function saveChannels(channels) {
  try {
    const response = await Channel.bulkWrite(
      channels.map((channel) => ({
        updateOne: {
          filter: { _id: channel._id },
          update: channel,
          upsert: true
        }
      }))
    );

    console.log(`Saving new channels to database (${response.upsertedCount} added)`);
  } catch (err) {
    throw new APIError(500, `Couldn't write new channel data to the database (${err.message})`);
  }
}

export async function getChannels({ skipUpdate } = {}) {
  let channels = await Channel.find({}).exec();

  if (!channels.length) {
    console.log('No channels in the database. Seeding from Google sheet');
    channels = await getChannelsFromGoogleSheet();
    await saveChannels(channels);
    if (!skipUpdate) {
      await updateChannelInfo(channels);
    }

    channels = await Channel.find({}).exec();
  }

  return channels;
}

function extractVideoDataRSS(video, channelId) {
  return {
    videoId: video._id,
    channelId,
    pubDate: video.pubDate,

    title: video.media['media:title'][0],
    link: buildYouTubeVideoLink(video._id),
    description: video.media['media:description'][0],
    channelTitle: video.author
  };
}

// Grab recent videos via their RSS feed
export async function getLatestVideosFromRSS(channels) {
  console.log(`Looking for recent uploads via RSS feeds for ${channels.length} channels`);

  const videos = (
    await Promise.all(
      channels.map(async (channel) => {
        let feed = [];
        const { uploadsPlaylistId, matchingPlaylists } = channel;

        debug(`Getting updates via RSS for ${channel.title}`);

        try {
          feed = [];
          if (matchingPlaylists?.length) {
            feed = (
              await Promise.all(
                matchingPlaylists.map(async (playlist) => parser.parseURL(buildFeedUrl(playlist)))
              )
            )
              .map((el) => el.items)
              .flat();
          } else if (uploadsPlaylistId) {
            feed = (await parser.parseURL(buildFeedUrl(uploadsPlaylistId))).items;
          } else {
            debug(`Skipping channel ID ${channel.channelId}, no playlists defined`);
          }
        } catch (err) {
          console.warn(`Couldn't get channel uploads via RSS for ${channel.name} (${err.message})`);
        }

        return feed.map((video) => extractVideoDataRSS(video, channel.channelId));
      })
    )
  ).flat();

  console.log(`Found ${videos.length} videos in RSS feeds`);

  return videos;
}

function extractVideoDataAPI({ snippet }) {
  return {
    videoId: snippet.resourceId.videoId,
    channelId: snippet.channelId,
    pubDate: snippet.publishedAt,

    title: snippet.title,
    link: buildYouTubeVideoLink(snippet.resourceId.videoId),
    description: snippet.description,
    channelTitle: snippet.channelTitle
  };
}

// Grab recent videos via the API feed
export async function getLatestVideosFromAPI(channels, maxResults = 20) {
  console.log(`Looking for recent uploads via API for ${channels.length} channels`);

  const playlistIds = channels
    // TODO: does this work for empty matchingPlaylists array?
    .map((channel) => channel.matchingPlaylists || channel.uploadsPlaylistId)
    .flat();

  // https://developers.google.com/youtube/v3/docs/playlistItems/list
  const response = await batchYouTubeRequest({
    endpoint: 'playlistItems.list',
    part: 'snippet',
    playlistIds,
    maxResults
  });

  console.log(`Found ${response.length} videos via API`);

  return response.map(extractVideoDataAPI);
}

export async function updateVideoIds(ids, { details }) {
  console.log(`Updating ${ids.length} videos (${details ? 'with' : 'without'} details)`);

  // contentDetails like the duration are static and only to be updated once
  const part = `statistics,id${details ? ',contentDetails' : ''}`;

  // https://developers.google.com/youtube/v3/docs/videos/list
  const response = await batchYouTubeRequest({
    endpoint: 'videos.list',
    part,
    ids
  });

  try {
    await Video.bulkWrite(
      response.map((video) => ({
        updateOne: {
          filter: { _id: video.id },
          update: {
            statistics: parseAllInts(video.statistics),
            contentDetails: video.contentDetails
          },
          upsert: true
        }
      }))
    );
  } catch (err) {
    throw new APIError(500, `Couldn't update channel data to database (${err.message})`);
  }
}

export async function saveVideos(videos) {
  let response;

  try {
    response = await Video.bulkWrite(
      videos.map((video) => ({
        updateOne: {
          filter: { _id: video.videoId },
          update: video,
          upsert: true
        }
      }))
    );
  } catch (err) {
    throw new APIError(500, `Couldn't save videos to database (${err.message})`);
  }

  console.log(`${pluralize('new video', response.upsertedCount, true)} added`);

  if (response.nUpserted) {
    await updateVideoIds(Object.values(response.upsertedIds), { details: true });
  }

  return response;
}

async function addChannelByChannelId(channelId, playlistId = null) {
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
      // TODO: This would reset the shortTitle if you added a channel again, wouldn't it?
      const update = { _id: channelId, shortTitle: channel.title, ...channel };
      if (playlistId) {
        update.$addToSet = { matchingPlaylists: playlistId };
        channel.matchingPlaylists = [playlistId];
      }

      response = await Channel.updateOne({ channelId }, update, { upsert: true });
    } catch (err) {
      throw new APIError(500, `Couldn't save new channel to database (${err.message})`);
    }

    if (response.upserted) {
      const videos = await getLatestVideosFromAPI([channel], 50);
      const { nUpserted } = await saveVideos(videos);

      let status = `YouTube channel ${title} added and ${pluralize(
        'video',
        nUpserted,
        true
      )} imported`;
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

export async function addNewChannel({ videoId, channelId, playlistId }) {
  if (videoId) {
    // Look up a video's channel first
    const [video] = await batchYouTubeRequest({
      endpoint: 'videos.list',
      part: 'snippet',
      ids: [videoId]
    });

    if (video) {
      return addChannelByChannelId(video.snippet.channelId);
    }
    throw new APIError(400, `YouTube API returned no video info for ${videoId}`);
  } else if (channelId) {
    return addChannelByChannelId(channelId);
  } else if (playlistId) {
    const [video] = await batchYouTubeRequest({
      endpoint: 'playlistItems.list',
      part: 'snippet',
      playlistIds: [playlistId],
      maxResults: 1
    });

    if (video) {
      return addChannelByChannelId(video.snippet.channelId, playlistId);
    }

    throw new APIError(400, 'Unable to identify channel for this playlist');
  } else {
    throw new APIError(400, 'Did not specify channel or video ID');
  }
}

export async function deleteVideoById(videoId) {
  try {
    const results = await Video.updateOne({ videoId }, { $set: { isDeleted: true } });

    if (results?.nModified) {
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

// wrapper function for a GET API endpoint for channels, videos that handles search
export async function searchModelAPI(model, params) {
  let response = {};

  try {
    await dbConnect();

    // querystring needs to be converted into a format that api-query-params can handle
    const queryString = params
      ? Object.entries(params)
          .map(([param, value]) => {
            return `${encodeURIComponent(param)}${value && `=${encodeURIComponent(value)}`}`;
          })
          .join('&')
      : {};
    let { filter, skip, limit = 10, sort, projection, population } = aqp(queryString);

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

export async function bookmarkletAction(event, validateData, callback) {
  try {
    await dbConnect();

    const { url, secret } = JSON.parse(event.body);

    if (secret !== process.env.ADD_URL_SECRET) throw new APIError(401, 'Unauthorized access');
    if (!url) throw new APIError(400, 'Missing URL');

    const urlData = parseURL(decodeURIComponent(url), true);

    if (!urlData) throw new APIError(400, 'Invalid URL');
    if (!urlData.hostname.match(/youtube.com$/))
      throw new APIError(400, 'No valid YouTube URL detected');

    const bookmarkletData = validateData(urlData);
    return buildHttpResponse({ status: await callback(bookmarkletData) });
  } catch (err) {
    return buildHttpError(err);
  }
}
