import mongoose from 'mongoose';
const Schema = mongoose.Schema;

export default mongoose.model('Channel', new Schema({
  _id: String,
  channel_id: String,
  title: String,
  description: String,
  customURL: String,
  published_at: Date,
  country: String,
  thumbnails: Schema.Types.Mixed,
  statistics: Schema.Types.Mixed,
  uploads_playlist_id: String,
  homepage: String,
  twitter: String,
  instagram: String
}));