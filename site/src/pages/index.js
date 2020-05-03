import { graphql } from 'gatsby';
import React from 'react';

import { populateRelationships } from '../util';

import Layout from '../components/Layout';
import VideoList from '../components/VideoList';
import Pagination from '../components/Pagination';

import { VIDEOS_PER_PAGE } from '../config';

export default ({ data }) => {
  const videos = populateRelationships({
    parents: data.channels.nodes,
    children: data.videos.nodes,
    foreignKey: 'author'
  });

  return (
    <Layout>
      <VideoList videos={videos} />
      <Pagination page={1} numPages={Math.ceil(data.videos.totalCount / VIDEOS_PER_PAGE)} />
    </Layout>
  );
};

export const query = graphql`
  query RecentVideosQuery {
    videos: allMongodbLearnchineseclubVideos(
      filter: { isDeleted: { ne: true } }
      limit: 30
      sort: { fields: [pubDate], order: DESC }
    ) {
      nodes {
        id
        videoId
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
        shortTitle
        mongodb_id
      }
    }
  }
`;
