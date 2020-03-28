import mongoose from 'mongoose';
import { google } from 'googleapis';

import 'db';
import { getChannelsFromGoogleSheet } from 'main';
import Channel from 'models/Channel';
import Video from 'models/Video';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

async function saveNewChannels(channels) {
  try {
    let response = await Channel.bulkWrite(channels.map(({ id, homepage, twitter, instagram})  => ({
      updateOne: {
        filter: { _id: id },
        update: { 
          _id: id, 
          ...(homepage && { homepage }),
          ...(twitter && { twitter }),
          ...(instagram && { instagram })
        },
        upsert: true
      }
    })));

    console.log(`Saving new channels to database (${response.upsertedCount} added)`);
  } catch (err) {
    console.error(`Couldn't write new channel data to the database: ${err.message}`);

    return
  }

  // ...then get details on each channel from the YouTube API
  const latestChannels = await Channel.find({}).exec();
  console.log(`database now has ${ latestChannels.length } channels`);
}

async function updateChannelInfo() {
  const channels = await Channel.find({}).exec();
  console.log(`Loaded ${ channels.length } channels for info update`);

  console.log(channels[2]);
  // return;

  var response = await youtube.channels.list({
    part: 'snippet,statistics,contentDetails',
    id: channels.map(c => c._id).join(',')
  });

  // TODO: Error check response
  const channel_data = response.data.items.map(channel => {
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
    }
  });

  console.log(JSON.stringify(channel_data[2], null, 2));

  try {
    response = await Channel.bulkWrite(channel_data.map(channel  => ({
      updateOne: {
        filter: { _id: channel.channel_id },
        update: channel,
        upsert: true
      }
    })));

    console.log(`Saving new channels to database (${response.upsertedCount} added)`);
  } catch (err) {
    console.error(`Couldn't write new channel data to the database: ${err.message}`);

    return
  }

  return;
}

(async () => {
  // const channels = await getChannelsFromGoogleSheet();
  // await saveNewChannels(channels);
  await updateChannelInfo();

  mongoose.disconnect();
})();