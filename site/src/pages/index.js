import { graphql } from 'gatsby';
import React from 'react';

import { populateChannelInfo } from '../util';

import Layout from '../components/Layout';
import VideoList from '../components/VideoList';
import Pagination from '../components/Pagination';

import { VIDEOS_PER_PAGE } from '../config';

export default ({ data }) => {
  const channels = data.channels.nodes;
  const videos = populateChannelInfo(data.videos.nodes, channels, ['shortTitle']);

  return (
    <Layout>
      <VideoList videos={videos} />
      <Pagination page={1} numPages={ Math.ceil(data.videos.totalCount / VIDEOS_PER_PAGE) } />
    </Layout>
  );
};

export const query = graphql`
  query RecentVideosQuery {
    videos: allMongodbChineseyoutubeVideos(
      filter: { isDeleted: { ne: true } }
      limit: 30
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
      totalCount
    }

    channels: allMongodbChineseyoutubeChannels {
      nodes {
        channelId
        shortTitle
      }
    }
  }
`;
