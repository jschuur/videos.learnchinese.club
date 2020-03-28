import React from 'react';
import styled from 'styled-components';

const VideoCard = styled.div`
  margin-top: 20px;
  max-width: 300px;
  a > img {
    width: 100%;
    margin: 10px auto;
  }
`;

export default function VideoItem({ video: { _id, title, link, thumbnail, author }}) {
  return (
    <VideoCard>
      { author }
      <a href={ link }>
        <img src={ thumbnail.url } alt={ title }/>
      </a> 
      { title }
    </VideoCard>
  )
}