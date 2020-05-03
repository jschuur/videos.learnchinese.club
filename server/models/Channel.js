import mongoose from 'mongoose';

const { Schema } = mongoose;

export default mongoose.model(
  'Channel',
  new Schema(
    {
      channelId: String,
      title: String,
      shortTitle: String,
      description: String,
      customURL: String,
      pubDate: Date,
      videos: [{ type: Schema.Types.ObjectId, ref: 'Video' }],
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
      versionKey: false,
      timestamps: true
    }
  )
);
