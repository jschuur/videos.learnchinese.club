import { graphql } from 'gatsby'
import React from 'react';

import Layout from '../components/Layout';
import VideoList from '../components/VideoList';

export default ({data}) => {
  const { nodes: videos } = data.allMongodbChineseyoutubeVideos;

  return (
    <Layout>
      <VideoList videos={ videos } />
    </Layout>
  );
}

export const query = graphql`
  query RecentVideosQuery {
    allMongodbChineseyoutubeVideos(
      limit: 60
      sort: {
        fields: [published_at]
        order: DESC
      }
    ) {
      nodes {
        id
        author
        thumbnail {
          url
        }
        title
        link
        published_at
      }
    }
  }
`