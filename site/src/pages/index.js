import { graphql } from 'gatsby'
import React from 'react';

import Layout from '../components/Layout';
import VideoList from '../components/VideoList';
import Pagination from '../components/Pagination';

export default ({data}) => {
  const { nodes: videos } = data.allMongodbChineseyoutubeVideos;

  return (
    <Layout>
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
        fields: [published_at]
        order: DESC
      }
    ) {
      nodes {
        id
        video_id
        author
        title
        link
        published_at
        content_details {
          duration
        }
      }
    }
  }
`