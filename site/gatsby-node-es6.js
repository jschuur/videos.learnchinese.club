import path from 'path';
import { createFilePath } from 'gatsby-source-filesystem';
import { populateChannelInfo } from './src/util';

// teach GraphQL that even if no video is marked as deleted, it is a Boolean
exports.sourceNodes = ({ actions }) => {
  const { createTypes } = actions;
  const typeDefs = `
    type mongodbChineseyoutubeVideos implements Node {
      isDeleted: Boolean
    }
  `;
  createTypes(typeDefs);
};

exports.createPages = async ({ graphql, actions, reporter }) => {
  const { createPage } = actions;
  const result = await graphql(
    `
      query VideoArchiveQuery {
        videos: allMongodbChineseyoutubeVideos(
          filter: { isDeleted: { ne: true } }
          sort: { fields: [pubDate], order: DESC }
        ) {
          nodes {
            id
            videoId
            channelId
            title
            link
            pubDate
            contentDetails {
              duration
            }
          }
        }

        channels: allMongodbChineseyoutubeChannels {
          nodes {
            channelId
            shortTitle
          }
        }
      }
    `
  );
  if (result.errors) {
    reporter.panicOnBuild(`Error while running GraphQL query.`);
    return;
  }

  const channels = result.data.channels.nodes;
  const videos = populateChannelInfo(result.data.videos.nodes, channels, ['shortTitle']);

  const videosPerPage = 30;
  const numPages = Math.ceil(videos.length / videosPerPage);

  Array.from({ length: numPages }).forEach((_, i) => {
    let start = i * videosPerPage;
    let end = i * videosPerPage + videosPerPage;

    createPage({
      path: i === 0 ? `/page` : `/page/${i + 1}`,
      component: path.resolve('./src/templates/video-archive-template.js'),
      context: {
        videos: videos.slice(start, end),
        limit: videosPerPage,
        skip: i * videosPerPage,
        numPages,
        currentPage: i + 1
      }
    });
  });
};
exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions;
  if (node.internal.type === `MongodbChineseyoutubeVideos`) {
    const value = createFilePath({ node, getNode });
    createNodeField({
      node,
      value
    });
  }
};
