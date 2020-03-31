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
  thumbnail: Schema.Types.Mixed,
  rating: Number,
  views: Number,
  published_at: Date
}));