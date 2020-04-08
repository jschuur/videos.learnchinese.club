import mongoose from 'mongoose';
const Schema = mongoose.Schema;

export default mongoose.model('Channel', new Schema({
  _id: String,
  channelId: String,
  title: String,
  description: String,
  customURL: String,
  pubDate: Date,
  country: String,
  thumbnails: Schema.Types.Mixed,
  statistics: Schema.Types.Mixed,
  uploadsPlaylistId: String,
  homepage: String,
  twitter: String,
  instagram: String
}, {
  versionKey: false
}));