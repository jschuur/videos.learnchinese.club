import React, { useState, useEffect } from 'react'
import axios from 'axios';
import styled from 'styled-components';

import { ApiUrl } from '../util';
import VideoItem from './VideoItem.js';

const VideoGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
`;

export default function VideoList() {
  const [videos, setVideos] = useState({ videos: [] });

  useEffect(() => {
    const fetchData = async () => {
      const result = await axios(ApiUrl('videos'));
      setVideos(result.data);
    };

    fetchData();
  }, []);

  return (
    <>
      { videos.videos.length ?
        <VideoGrid>
          { videos.videos.map(video => 
            (<VideoItem video={ video } key={video._id} />)
          )}
        </VideoGrid>
        : 'Loading' 
      }
    </>
  );
}