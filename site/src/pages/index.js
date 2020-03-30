import { graphql } from 'gatsby'
import React from 'react';
import styled from 'styled-components';

import VideoList from '../components/VideoList';

const Container = styled.div`
  font-family: Arial, Helvetica, sans-serif;
  width: 80%;
  max-width: 1000px;
  margin: 0 auto;
`;

export default ({data}) => {
  const { nodes: videos } = data.allMongodbChineseyoutubeVideos;

  return (
    <Container>
      <VideoList videos={ videos } />
    </Container>
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