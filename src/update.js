import mongoose from 'mongoose';

import { getChannelsFromGoogleSheet, getLatestVideos, saveVideosToDB, writeVideoJSON } from 'main';

(async () => {
  console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);

  let channels = await getChannelsFromGoogleSheet();
  let videos = await getLatestVideos(channels);
  await saveVideosToDB(videos);
  await writeVideoJSON(JSON.stringify(videos));

  mongoose.disconnect();
})();