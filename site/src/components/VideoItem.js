import React from 'react';
import styled from 'styled-components';
import TimeAgo from 'react-timeago';
import ytDurationFormat from 'youtube-duration-format';

import { getVideoThumbnail } from '../util';

const VideoCard = styled.div`
  margin: 10px;
  max-width: 320px;
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
  /* width: 100%; */
`;

const Title = styled.div`
  font-weight: bold;
  margin-bottom: 5px;
  line-height: 1.5em;
`;

const ThumbnailWrapper = styled.div`
  position: relative;
  display: inline-block;
  margin: 10px auto;
`;

const VideoDuration = styled.div`
  position: absolute;
  background: rgb(0, 0, 0, 0.8);
  color: white;
  bottom: 0;
  right: 0;
  margin: 8px 4px;
  padding: 2px 4px;
  font-family: 'Roboto', sans-serif;
  font-weight: 500;
  font-size: 12px;
  border-radius: 2px;
  letter-spacing: 0.5px;
`;

export default function VideoItem({
  video: { videoId, title, link, author, pubDate, contentDetails }
}) {
  const thumbnail = getVideoThumbnail(videoId, 'medium');

  return (
    <VideoCard>
      <ChannelTitle>{author?.shortTitle}</ChannelTitle>
      <a href={link}>
        <ThumbnailWrapper>
          <Thumbnail
            src={thumbnail.url}
            width={thumbnail.width}
            height={thumbnail.height}
            alt={title}
          />
          {contentDetails?.duration && (
            <VideoDuration>{ytDurationFormat(contentDetails.duration)}</VideoDuration>
          )}
        </ThumbnailWrapper>
      </a>
      <Title>{title.trim()}</Title>
      <Age date={pubDate} />
    </VideoCard>
  );
}
