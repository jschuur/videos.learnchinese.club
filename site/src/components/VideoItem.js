import React from 'react';
import styled from 'styled-components';
import TimeAgo from 'react-timeago';

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
`

const Author = styled.div`
  font-size: 0.9rem;
`
const Thumbnail = styled.img`
  border: 1px solid lightgrey;
`

const Title = styled.div`
  font-weight: bold;
  margin-bottom: 5px;
`

export default function VideoItem({ video: { title, link, thumbnail, author, published_at }}) {
  return (
    <VideoCard>
      <Author>{ author }</Author>
      <a href={ link }>
        <Thumbnail src={ thumbnail.mq.url } alt={ title }/>
      </a>
      <Title>{ title }</Title>
      <Age date={ published_at } />
    </VideoCard>
  )
}