import mongoose from 'mongoose';

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  } catch (err) {
    console.error(`Couldn't connect to database: ${err.message}`);

    // TODO: throw error
    process.exit(1);
  }
})();