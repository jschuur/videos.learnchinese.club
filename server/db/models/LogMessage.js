import mongoose from 'mongoose';

const { Schema } = mongoose;

export default mongoose.model(
  'LogMessage',
  new Schema(
    {
      message: String,
      scope: String,
      type: { type: String, enum: ['info', 'log', 'warn', 'error'], default: 'info' },
      createdAt: { type: Date, default: Date.now },
      expiresAt: Date,
      metaData: Schema.Types.Mixed
    },
    {
      versionKey: false
    }
  )
);
