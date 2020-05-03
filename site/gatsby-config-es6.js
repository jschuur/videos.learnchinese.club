import parse from 'url-parse';
import { SITE_TITLE, SITE_DESCRIPTION } from './src/config';

require('dotenv').config({
  path: `../.env.${process.env.NODE_ENV}`
});

// gatsby-source-mongodb needs options in a specific format for MongoDB Atlas
// By extracting it from MONGODB_URL, we can reuse the same secret
// for Mongoose in the lambdas, which has different URL requirements
function extractMongoDbOptions(dbUrl) {
  const {
    protocol,
    username,
    password,
    hostname,
    port = '27017',
    pathname,
    extraParams: query
  } = parse(dbUrl, true);

  const connectionString = `${protocol}//${username}:${password}@${hostname}:${port}`;

  return {
    dbName: pathname.replace('/', ''),
    connectionString,
    collection: ['videos', 'channels'],
    extraParams: query,
    preserveObjectIds: true
  };
}

module.exports = {
  siteMetadata: {
    title: SITE_TITLE,
    titleTemplate: `%s · ${SITE_TITLE}`,
    description: SITE_DESCRIPTION,
    url: 'https://videos.learnchinese.club',
    image: '/images/logo-512x512.png',
    twitterUsername: '@LearnChineseCLB',
    lastUpdate: new Date()
  },
  plugins: [
    {
      resolve: `gatsby-plugin-gtag`,
      options: {
        trackingId: `UA-107202787-3`,
        head: false,
        anonymize: true
      }
    },
    {
      resolve: `gatsby-plugin-google-fonts`,
      options: {
        fonts: [
          // eslint-disable-next-line no-useless-escape
          `Roboto\:500` // you can also specify font weights and styles
        ],
        display: 'swap'
      }
    },
    `gatsby-plugin-react-helmet`,
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: SITE_TITLE,
        short_name: '学习中文视频',
        description: SITE_DESCRIPTION,
        start_url: `/`,
        background_color: '#f7f0eb',
        theme_color: '#a2466c',
        display: 'standalone',
        icons: [
          {
            src: '/images/logo-16x16.png',
            sizes: '16x16',
            type: 'image/png'
          },
          {
            src: '/images/logo-32x32.png',
            sizes: '32x32',
            type: 'image/png'
          },
          {
            src: '/favicon.io',
            sizes: '48x48',
            type: 'image/x-icon'
          },
          {
            src: '/images/logo-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/images/logo-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    },
    {
      resolve: 'gatsby-source-mongodb',
      options: extractMongoDbOptions(process.env.MONGODB_URL)
    }
  ]
};
