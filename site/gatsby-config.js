require("dotenv").config({
  path: `../.env.${process.env.NODE_ENV}`,
});

// https://stackoverflow.com/questions/54089978/stuck-trying-to-fetch-data-from-mongodb-into-gatsby-using-gatsby-source-mongodb
var mongoDBExtraParams = process.env.NODE_ENV == 'production' ?
  {
    retryWrites: true,
    ssl: true,
    authSource: 'admin',
    replicaSet: process.env.MONGODB_REPLICASET
  }
  : undefined;

module.exports = {
  siteMetadata: {
    title: `Learn Chinese Club Videos`,
    siteUrl: 'https://videos.learnchinese.club',
    lastUpdate: new Date().toUTCString()
  },
  plugins: [
    {
      resolve: 'gatsby-plugin-google-analytics',
      options: {
        trackingId: '107202787-3',
        head: false
      },
    },
    {
        resolve: `gatsby-plugin-s3`,
        options: {
            bucketName: 'club.learnchinese.videos'
        },
    },
    {
      resolve: 'gatsby-source-mongodb',
      options: {
        dbName: process.env.MONGODB_DATABASE,
        collection: ['videos', 'channels'],
        server: {
          address: process.env.MONGODB_HOST,
          port: 27017
        },
        auth: {
          user: process.env.MONGODB_USER,
          password: process.env.MONGODB_PASSWORD
        },
        extraParams: mongoDBExtraParams
      }
    }
  ]
}
