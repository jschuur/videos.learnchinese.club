import mongoose from 'mongoose';

const { Schema } = mongoose;

export default mongoose.model(
  'Channel',
  new Schema(
    {
      _id: String,
      channelId: String,
      title: String,
      shortTitle: String,
      description: String,
      customURL: String,
      pubDate: Date,
      country: String,
      thumbnails: Schema.Types.Mixed,
      statistics: Schema.Types.Mixed,
      uploadsPlaylistId: String,
      matchingPlaylists: Array,
      homepage: String,
      twitter: String,
      instagram: String
    },
    {
      versionKey: false
    }
  )
);
