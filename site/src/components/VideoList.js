import React from 'react'
import styled from 'styled-components';

import VideoItem from './VideoItem.js';

const VideoGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
`;

export default function VideoList({ videos }) {
  return (
    <>
      { videos.length ?
        <VideoGrid>
          { videos.map(video =>
            (<VideoItem video={ video } key={video.id} />)
          )}
        </VideoGrid>
        : 'Loading'
      }
    </>
  );
}