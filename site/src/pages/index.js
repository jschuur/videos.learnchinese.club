import { graphql } from 'gatsby'
import React from 'react';
import Helmet from 'react-helmet';

import Layout from '../components/Layout';
import VideoList from '../components/VideoList';
import Pagination from '../components/Pagination';

export default ({data}) => {
  const { nodes: videos } = data.allMongodbChineseyoutubeVideos;

  return (
    <Layout>
      <Helmet>
          <title>Learn Chinese Club Videos</title>
      </Helmet>
      <VideoList videos={ videos } />
      <Pagination page={ 1 } />
    </Layout>
  );
}

export const query = graphql`
  query RecentVideosQuery {
    allMongodbChineseyoutubeVideos(
      filter: {
        isDeleted: {ne: true}
      }
      limit: 30
      sort: {
        fields: [pubDate]
        order: DESC
      }
    ) {
      nodes {
        id
        videoId
        channelTitle
        title
        link
        pubDate
        contentDetails {
          duration
        }
      }
    }
  }
`