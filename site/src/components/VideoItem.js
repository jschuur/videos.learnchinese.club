import React from 'react';
import styled from 'styled-components';
import TimeAgo from 'react-timeago';
import ytDurationFormat from 'youtube-duration-format';

import { getVideoThumbnail } from '../util';

const VideoCard = styled.div`
  margin: 10px;
  max-width: 300px;
  a > img {
    width: 100%;
    margin: 10px auto;
  }
`;

const Age = styled(TimeAgo)`
  display: block;
  color: grey;
  text-align: right;
  font-size: 0.8rem;
`;

const Author = styled.div`
  font-size: 0.9rem;
`;
const Thumbnail = styled.img`
  border: 1px solid lightgrey;
`;

const Title = styled.div`
  font-weight: bold;
  margin-bottom: 5px;
`;

const VideoDuration = styled.span`
  color: silver;
  font-weight: normal;
  &&::before {
    content: " ("
  }
  &&::after {
    content: ")"
  }
`;

export default function VideoItem({ video: { video_id, title, link, author, published_at, content_details }}) {
  var thumbnail = getVideoThumbnail(video_id, 'medium');

  return (
    <VideoCard>
      <Author>{ author }</Author>
      <a href={ link }>
        <Thumbnail src={ thumbnail.url } width={ thumbnail.width } height={ thumbnail.height } alt={ title }/>
      </a>
      <Title>
        { title }
        <VideoDuration>{ ytDurationFormat(content_details.duration) }</VideoDuration>
      </Title>
      <Age date={ published_at } />
    </VideoCard>
  )
}