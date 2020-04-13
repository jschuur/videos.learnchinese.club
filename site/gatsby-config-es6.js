require('dotenv').config({
  path: `../.env.${process.env.NODE_ENV}`,
});

import { SITE_TITLE, SITE_DESCRIPTION } from './src/config';

// https://stackoverflow.com/questions/54089978/stuck-trying-to-fetch-data-from-mongodb-into-gatsby-using-gatsby-source-mongodb
var mongoDBExtraParams =
  process.env.NODE_ENV == 'production'
    ? {
      retryWrites: true,
      ssl: true,
      authSource: 'admin',
      replicaSet: process.env.MONGODB_REPLICASET,
    }
    : undefined;

module.exports = {
  siteMetadata: {
    title: SITE_TITLE,
    titleTemplate: `%s · ${SITE_TITLE}`,
    description: SITE_DESCRIPTION,
    url: 'https://videos.learnchinese.club',
    image: '/images/logo-512x512.png',
    twitterUsername: '@LearnChineseCLB',
    lastUpdate: new Date().toUTCString(),
  },
  plugins: [
    {
      resolve: `gatsby-plugin-gtag`,
      options: {
        trackingId: `UA-107202787-3`,
        head: false,
        anonymize: true,
      },
    },
    `gatsby-plugin-react-helmet`,
    {
      resolve: 'gatsby-source-mongodb',
      options: {
        dbName: process.env.MONGODB_DATABASE,
        collection: ['videos', 'channels'],
        server: {
          address: process.env.MONGODB_HOST,
          port: 27017,
        },
        auth: {
          user: process.env.MONGODB_USER,
          password: process.env.MONGODB_PASSWORD,
        },
        extraParams: mongoDBExtraParams,
      },
    },
  ]
};
