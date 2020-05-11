import { parseAllInts } from '/lib/util';
import { buildYouTubeVideoLink } from '/lib/youtube';

// Get only the channel data we want to store from an API response
export function extractChannelData({ id: channelId, snippet, contentDetails, statistics }) {
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
    uploadsPlaylistId: contentDetails?.relatedPlaylists?.uploads
  };
}

// Get the video data we care about from the RSS feed data
export function extractVideoDataRSS({ videoId, channelId, pubDate, media }) {
  return {
    videoId,
    channelId,

    pubDate: new Date(pubDate),
    title: media['media:title'][0],
    link: buildYouTubeVideoLink(videoId),
    description: media['media:description'][0]
  };
}

// Get the video data we care about from the API data
export function extractVideoDataAPI({ snippet }) {
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
