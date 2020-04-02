import { google } from 'googleapis';

// Get new videos
// playlistItems.list / playlistId / one at a time / part: snippet

// Get video length
// videos.list / id / batchable / part: contentDetails

// Find deleted videos
// videos.list / id / batchable / part: id

// Get channel info
// channels.list / id / batchable / part: snippet, contendDetails, statistics

// Update video view/rating
// videos.list / id / batchable / part: statistics

const MAX_BATCH_SIZE = 50;

export async function batchYouTubeRequest({ endpoint, ids, playlistIds, part}) {
  var results = [];
  var idField = 'id';
  var batchSize = MAX_BATCH_SIZE;
  var [model, action] = endpoint.split('.');

  // Only the playlists end point can't accept batches of IDs and uses a different field name
  if(playlistIds) {
    batchSize = 1;
    idField = 'playlistId';
    ids = playlistIds;
  }

  const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY,
  });

  var options = { part };

  // Loop through each batch of updates
  for(let i = 0; i < ids.length; i += batchSize) {
    let chunk = ids.slice(i, i + batchSize);
    options[idField] = chunk.join(',');

    let response = await youtube[model][action](options);
    results.push(...response.data.items);
  }

  return results;
}