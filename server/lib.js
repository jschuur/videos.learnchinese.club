import { GoogleSpreadsheet } from 'google-spreadsheet';
import pluralize from 'pluralize';
import aqp from 'api-query-params';
import Parser from 'rss-parser';

import Video from './models/Video';
import Channel from './models/Channel';

import dbConnect from './db';
import {
  batchYouTubeRequest,
  buildYouTubeVideoLink,
  buildFeedUrl,
  buildHttpResponse,
  buildHttpError,
  APIError,
  debug,
} from './util';

// Remap some fields when importing from YouTube RSS feeds
const parser = new Parser({
  customFields: {
    item: [['media:group', 'media'], ['yt:videoId', '_id']]
  }
});

const MAX_API_SEARCH_LIMIT = 100;

export async function getChannels({ skipUpdate } = {}) {
  var channels = await Channel.find({}).exec();

  if(!channels.length) {
    console.log('No channels in the database. Seeding from Google sheet');
    channels = await getChannelsFromGoogleSheet();
    await saveChannels(channels);
    if(!skipUpdate) {
      await updateChannelInfo(channels);
    }

    channels = await Channel.find({}).exec();
  }

  return channels;
}

export async function getChannelsFromGoogleSheet() {
  try {
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
    doc.useApiKey(process.env.GOOGLE_API_KEY);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0]; // or use doc.sheetsById[id]
    var channels = await sheet.getRows();
  } catch(err) {
    throw new APIError(500, `Couldn't access Google Sheet to import channels (${err.message})`)
  }

  // Rename the id column, so we can use this array elsewhere
  channels = channels.map(channel => {
    let { id: _id, ...data } = channel;
    return { _id, channel_id: _id, ...data };
  });

  console.log(`Found ${channels.length} channels in Google sheet`);

  return channels;
}

function extractVideoDataRSS(video, channelId) {
  return {
    video_id: video._id,
    channel_id: channelId,
    published_at: video.pubDate,

    title: video.media['media:title'][0],
    link: buildYouTubeVideoLink(video._id),
    description: video.media['media:description'][0],
    author: video.author
  };
}

// Grab recent videos via their RSS feed
export async function getLatestVideosFromRSS(channels) {
  console.log(`Looking for recent uploads via RSS feeds for ${channels.length} channels`);

  const videos = (await Promise.all(channels.map(async channel => {
    debug(`Getting updates via RSS for ${channel.title}`);

    try {
      var feed = await parser.parseURL(buildFeedUrl(channel.channel_id));
    } catch(err) {
      console.warn(`Couldn't get channel uploads via RSS for ${channel.name} (${err.message})`);
    };

    return feed.items.map(video => extractVideoDataRSS(video, channel.channel_id));
  }))).flat();

  console.log(`Found ${videos.length} videos in RSS feeds`);

  return videos;
}

function extractVideoDataAPI({ snippet }) {
  return {
    video_id: snippet.resourceId.videoId,
    channel_id: snippet.channelId,
    published_at: snippet.publishedAt,

    title: snippet.title,
    link: buildYouTubeVideoLink(snippet.resourceId.videoId),
    description: snippet.description,
    author: snippet.channelTitle
  };
}

// Grab recent videos via the API feed
export async function getLatestVideosFromAPI(channels, maxResults = 20) {
  console.log(`Looking for recent uploads via API for ${channels.length} channels`);

  // https://developers.google.com/youtube/v3/docs/playlistItems/list
  const response = await batchYouTubeRequest({
    endpoint: 'playlistItems.list',
    part: 'snippet',
    playlistIds: channels.map(c => c.uploads_playlist_id),
    maxResults
  });

  console.log(`Found ${response.length} videos via API`);

  return response.map(extractVideoDataAPI);
}

export async function saveVideos(videos) {
  try {
    var response = await Video.bulkWrite(videos.map(video => ({
      updateOne: {
        filter: {_id: video.video_id},
        update: video,
        upsert: true
      }
    })));
  } catch (err) {
    throw new APIError(500, `Couldn't save videos to database (${err.message})`);
  }

  console.log(`${pluralize('new video', response.upsertedCount, true)} added`);

  response.nUpserted && await updateVideoIds(Object.values(response.upsertedIds), { details: true });

  return response;
}

export async function updateVideoIds(ids, { details }) {
  console.log(`Updating ${ ids.length } videos (${details ? 'with' : 'without'} details)`);

  // contentDetails like the duration are static and only to be updated once
  var part = `statistics,id${details ? ',contentDetails' : ''}`;

  // https://developers.google.com/youtube/v3/docs/videos/list
  var response = await batchYouTubeRequest({
    endpoint: 'videos.list',
    part,
    ids
  });

  try {
    await Video.bulkWrite(response.map(video  => ({
      updateOne: {
        filter: { _id: video.id },
        update: {
          statistics: video.statistics,
          content_details: video.contentDetails
        },
        upsert: true
      }
    })));
  } catch (err) {
    throw new APIError(500, `Couldn't update channel data to database (${err.message})`);
  }
}

export async function saveChannels(channels) {
  try {
    var response = await Channel.bulkWrite(channels.map((channel)  => ({
      updateOne: {
        filter: { _id: channel._id },
        update: channel,
        upsert: true
      }
    })));

    console.log(`Saving new channels to database (${response.upsertedCount} added)`);
  } catch (err) {
    throw new APIError(500, `Couldn't write new channel data to the database (${err.message})`);
  }
}

// Get only the channel data we want to store from an API response
function extractChannelData(channel) {
  var { snippet, contentDetails, statistics } = channel;

  return {
    channel_id: channel.id,
    title: snippet.title,
    description: snippet.description,
    customURL: snippet.customUrl,
    published_at: snippet.publishedAt,
    country: snippet.country,
    thumbnails: snippet.thumbnails,
    statistics,
    uploads_playlist_id: contentDetails.relatedPlaylists.uploads,
  };
}

export async function updateChannelInfo(channels) {
  console.log(`Loaded ${ channels.length } channels for info update`);

  // https://developers.google.com/youtube/v3/docs/channels/list
  var response = await batchYouTubeRequest({
    endpoint: 'channels.list',
    part: 'snippet,statistics,contentDetails',
    ids: channels.map(c => c.channel_id)
  });

  if(response?.length) {
    try {
      response = await Channel.bulkWrite(response.map(channel  => {
        let data = extractChannelData(channel);

        return {
          updateOne: {
            filter: { _id: data.channel_id },
            update: data,
            upsert: true
          }
        };
      }));
    } catch (err) {
      throw new APIError(500, `Couldn't update channel data to database (${err.message})`);
    }

    console.log(`Saving channel updates to database (${response.nModified} modified, ${response.upsertedCount} added)`);

    return response;
  } else {
    throw new APIError(400, 'YouTube API returned no channel info');
  }
}

async function addChannelByChannelId(channelId) {
  // Get the full channel data from the YouTube API
  const [item] = await batchYouTubeRequest({
    endpoint: 'channels.list',
    part: 'snippet,contentDetails,statistics',
    ids: [ channelId ]
  });

  if(item) {
    let channel = extractChannelData(item);
    let { title } = channel;

    try {
      var response = await Channel.updateOne(
        { channel_id: channelId },
        { _id: channelId, ...channel},
        { upsert: true }
      );
    } catch(err) {
      throw new APIError(500, `Couldn't save new channel to database (${ err.message })`);
    }

    if(response.upserted) {
      let videos = await getLatestVideosFromAPI([channel], 50);
      let { nUpserted } = await saveVideos(videos);

      return `YouTube channel ${ title } added and ${ pluralize('video', nUpserted, true) } imported`;
    } else {
      return `YouTube channel ${ title } is already tracked`;
    }
  } else {
    throw new APIError(400, `YouTube API returned no channel info for ${ channelId }`);
  };
}

export async function addNewChannel({ videoId, channelId }) {
  if(videoId) {
    // Look up a video's channel first
    const [ video ] = await batchYouTubeRequest({
      endpoint: 'videos.list',
      part: 'snippet',
      ids: [ videoId ]
    });

    if(video) {
      return addChannelByChannelId(video.snippet.channelId);
    } else {
      throw new APIError(400, `YouTube API returned no video info for ${ videoId }`);
    }
  } else if(channelId) {
    return addChannelByChannelId(channelId);
  } else {
    throw new APIError(400, 'Did not specify channel or video ID');
  }
}

// wrapper function for a GET API endpoint for channels, videos that handles search
export async function searchModelAPI(model, params) {
  try {
    await dbConnect();

    // querystring needs to be converted into a format that aqp can handle
    const queryString = params ? Object.entries(params).map(([param, value]) => {
      return `${encodeURIComponent(param)}${value && `=${encodeURIComponent(value)}`}`;
    }).join('&') : {};
    var { filter, skip, limit=10, sort, projection, population } = aqp(queryString);

    // sensible defaults
    if(limit > MAX_API_SEARCH_LIMIT) {
      limit = MAX_API_SEARCH_LIMIT;
      response.notice = `Max result size hit. Only returning first ${MAX_API_SEARCH_LIMIT} matches (use skip parameter to paginate).`;
    }
    if(!sort) {
      sort = { published_at: -1 };
    }

    let result = await model.find(filter)
      .skip(skip)
      .limit(limit)
      .sort(sort)
      .select(projection)
      .populate(population)
      .exec();

    var response = {
      totalCount: await model.countDocuments({}),
      matchingCount: await model.countDocuments(filter),
      ...(skip && { skip }),
      ...(limit && { limit })
    }

    if(result?.length) {
      response[pluralize(model.modelName).toLowerCase()] = result;
    } else {
      response = { ...response, statusCode: 404, status: 'No results found for the specified criteria' };
    }

    return buildHttpResponse(response);
  } catch (err) {
    return buildHttpError(err);
  }
}