import mongoose from 'mongoose';

import Video from '../server/models/Video';
import Channel from '../server/models/Channel';

(async () => {
  const db = await mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const videos = await Video.find({});
  const channels = await Channel.find({});

  const channelRefs = channels.reduce(
    (acc, channel) => ({ ...acc, [channel.channelId]: channel }),
    {}
  );

  const videoList = channels.reduce(
    (acc, channel) => ({
      ...acc,
      [channel.channelId]: videos.filter((video) => video.channelId === channel.channelId)
    }),
    {}
  );

  console.log(`Associating ${videos.length} videos with author references...`);
  let response = await Video.bulkWrite(
    videos.map((video) => ({
      updateOne: {
        filter: { videoId: video.videoId },
        update: { author: channelRefs[video.channelId] }
      }
    }))
  );
  console.log(`Modified ${response.nModified} documents`);

  console.log(`Populating video references to ${channels.length} channels...`);
  response = await Channel.bulkWrite(
    videos.map((channel) => ({
      updateOne: {
        filter: { channelId: channel.channelId },
        update: { videos: videoList[channel.channelId] }
      }
    }))
  );
  console.log(`Modified ${response.nModified} documents`);

  db.disconnect();
})();
