const mongoose = require('mongoose');
const Schema = mongoose.Schema;

module.exports = mongoose.model('Video', new Schema({
  _id: String,
  title: String,
  link: String,
  author: String,
  channelId: String,
  description: String,
  thumbnail: Schema.Types.Mixed,
  rating: Number,
  views: Number,
  published_at: Date
}));