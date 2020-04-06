import React from 'react'
import { graphql } from 'gatsby'

import Layout from '../components/Layout'
import VideoList from '../components/VideoList';
import Pagination from '../components/Pagination';

export default ({ data, pageContext }) => {
  const videos = data.allMongodbChineseyoutubeVideos.nodes;

  return (
    <Layout>
        <VideoList videos={ videos } />
        <Pagination page={ pageContext.currentPage } />
    </Layout>
  );
}

export const query = graphql`
  query VideoArchiveQuery($skip: Int!, $limit: Int!) {
    allMongodbChineseyoutubeVideos(
      limit: $limit
      skip: $skip
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
      }
    }
  }
`