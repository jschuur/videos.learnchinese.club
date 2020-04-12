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

const ChannelTitle = styled.div`
  font-size: 0.9rem;
`;
const Thumbnail = styled.img`
  border: 1px solid lightgrey;
`;

const Title = styled.div`
  font-weight: bold;
  margin-bottom: 5px;
  line-height: 1.5em;
`;

const VideoDuration = styled.span`
  color: silver;
  font-weight: normal;
`;

export default function VideoItem({
  video: { videoId, title, link, channel, pubDate, contentDetails }
}) {
  var thumbnail = getVideoThumbnail(videoId, 'medium');

  return (
    <VideoCard>
      <ChannelTitle>{channel?.shortTitle}</ChannelTitle>
      <a href={link}>
        <Thumbnail
          src={thumbnail.url}
          width={thumbnail.width}
          height={thumbnail.height}
          alt={title}
        />
      </a>
      <Title>
        {title.trim()}
        <VideoDuration>{contentDetails?.duration && ` (${ytDurationFormat(contentDetails.duration)})`}</VideoDuration>
      </Title>
      <Age date={pubDate} />
    </VideoCard>
  );
}
