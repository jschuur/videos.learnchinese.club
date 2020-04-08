import mongoose from 'mongoose';
const Schema = mongoose.Schema;

export default mongoose.model('Video', new Schema({
  _id: String,
  title: String,
  link: String,
  author: String,
  channel_id: String,
  video_id: String,
  description: String,
  statistics: Schema.Types.Mixed,
  content_details: Schema.Types.Mixed,
  published_at: Date,
  isDeleted: Boolean
}, {
  versionKey: false
}));