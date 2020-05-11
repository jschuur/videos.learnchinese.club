import mongoose from 'mongoose';

const { Schema } = mongoose;

export default mongoose.model(
  'Video',
  new Schema(
    {
      title: String,
      link: String,
      channelId: String,
      author: { type: Schema.Types.ObjectId, ref: 'Channel' },
      videoId: String,
      description: String,
      statistics: Schema.Types.Mixed,
      contentDetails: Schema.Types.Mixed,
      liveStreamingDetails: Schema.Types.Mixed,
      pubDate: Date,
      youTubeState: String,
      isDeleted: Boolean
    },
    {
      versionKey: false
    }
  )
);
