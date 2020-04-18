import mongoose from 'mongoose';

const { Schema } = mongoose;

export default mongoose.model(
  'Video',
  new Schema(
    {
      _id: String,
      title: String,
      link: String,
      channelTitle: String,
      channelId: String,
      videoId: String,
      description: String,
      statistics: Schema.Types.Mixed,
      contentDetails: Schema.Types.Mixed,
      pubDate: Date,
      isDeleted: Boolean
    },
    {
      versionKey: false
    }
  )
);
