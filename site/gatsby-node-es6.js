import path from 'path';

import { createFilePath } from 'gatsby-source-filesystem';
import { populateRelationships } from './src/util';

import { VIDEOS_PER_PAGE } from './src/config';

// teach GraphQL that even if no video is marked as deleted, it is a Boolean
exports.sourceNodes = ({ actions }) => {
  const { createTypes } = actions;
  const typeDefs = `
    type allMongodbLearnchineseclubVideos implements Node {
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
        videos: allMongodbLearnchineseclubVideos(
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
            author
          }
          totalCount
        }

        channels: allMongodbLearnchineseclubChannels {
          nodes {
            channelId
            shortTitle
            mongodb_id
          }
        }
      }
    `
  );
  if (result.errors) {
    reporter.panicOnBuild(`Error while running GraphQL query.`);
    return;
  }

  const videos = populateRelationships({
    parents: result.data.channels.nodes,
    children: result.data.videos.nodes,
    foreignKey: 'author'
  });
  const numPages = Math.ceil(result.data.videos.totalCount / VIDEOS_PER_PAGE);

  Array.from({ length: numPages }).forEach((_, i) => {
    const start = i * VIDEOS_PER_PAGE;
    const end = i * VIDEOS_PER_PAGE + VIDEOS_PER_PAGE;

    createPage({
      path: i === 0 ? `/page` : `/page/${i + 1}`,
      component: path.resolve('./src/templates/video-archive-template.js'),
      context: {
        videos: videos.slice(start, end),
        limit: VIDEOS_PER_PAGE,
        skip: i * VIDEOS_PER_PAGE,
        numPages,
        currentPage: i + 1
      }
    });
  });
};

exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions;
  if (node.internal.type === `allMongodbLearnchineseclubVideos`) {
    const value = createFilePath({ node, getNode });
    createNodeField({
      node,
      value
    });
  }
};
