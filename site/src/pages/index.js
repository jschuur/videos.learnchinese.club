import { graphql } from 'gatsby'
import React from 'react';
import styled from 'styled-components';

import Layout from '../components/Layout';
import VideoList from '../components/VideoList';

const Header = styled.h1`
  text-align: center;
`;

export default ({data}) => {
  const { nodes: videos } = data.allMongodbChineseyoutubeVideos;

  return (
    <Layout>
      <Header>Recent Videos</Header>
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
          mq {
            url
          }
        }
        title
        link
        published_at
      }
    }
  }
`