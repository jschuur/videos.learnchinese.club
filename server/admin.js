import parseURL from 'url-parse';
import pluralize from 'pluralize';

import dbConnect from '/db/db';
import { Channel, Video } from '/db/models';

import { extractChannelData } from '/lib/extract';
import { getLatestVideosFromAPI, saveVideos } from '/update';
import { APIError, buildHttpError, buildHttpResponse, logMessage } from '/lib/util';
import { youTubeVideosList, youTubeChannelsList, youTubePlaylistItems } from '/lib/youtube';

// Actually add a channel once its ID has been determined
export async function addChannelByChannelId({ channelId, playlistId }) {
  let response;

  // Get the full channel data from the YouTube API
  const [item] = await youTubeChannelsList({
    ids: [channelId],
    part: 'snippet,contentDetails,statistics'
  });

  if (item) {
    const channel = extractChannelData(item);
    const { title, channelId } = channel;

    try {
      // FIXME: Avoid resetting shortTitle if channel was added twice
      channel.shortTitle = title;
      if (playlistId) channel.$addToSet = { matchingPlaylists: playlistId };

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

      // TODO: Should make it clear when only a playlist is used to add them under
      let message = `YouTube channel ${title} added and ${pluralize(
        'video',
        upsertedCount,
        true
      )} imported`;
      logMessage({
        message,
        scope: 'admin:addChannel',
        metaData: { title, channelId, videosAdded: upsertedCount }
      });

      // Long channel names don't look great in a video card
      if (title?.length > 30) {
        message += ', consider shortening long channel name';
      }

      return message;
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
    const [video] = await youTubeVideosList({ ids: [videoId] });

    if (video) {
      return addChannelByChannelId({ channelId: video.snippet.channelId });
    }
    throw new APIError(400, `YouTube API returned no video info for ${videoId}`);
  } else if (channelId) {
    return addChannelByChannelId({ channelId });
  } else if (playlistId) {
    const [video] = await youTubePlaylistItems({ playlistIds: [playlistId], maxResults: 1 });

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
    const results = await Video.updateOne({ videoId }, { isDeleted: true });

    if (results?.nModified) {
      // Also remove it from the videos array
      const video = await Video.findOne({ videoId }).populate('author');
      // TODO: Can I do this in middleware?
      if (video) {
        await Channel.updateOne({ _id: video.author }, { $pull: { videos: video._id } });
      }

      const { title, channelId } = video;
      logMessage({
        message: `Video '${title}' deleted by and admin action`,
        scope: 'admin:deleteVideo',
        metaData: { title, videoId, channelId, channel: video.author.shortTitle }
      });

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
