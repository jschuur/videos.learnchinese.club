import React from "react"
import { useStaticQuery, graphql } from "gatsby"
import styled from 'styled-components';

const Footer = styled.footer`
  font-size: 0.8rem;
  color: grey;
  text-align: center;
`;

export default () => {
  const data = useStaticQuery(graphql`
  {
    videos: allMongodbChineseyoutubeVideos {
      totalCount
    }

    channels: allMongodbChineseyoutubeChannels {
      totalCount
    }

    site {
      siteMetadata {
        lastUpdate
      }
    }
  }`);

  const { lastUpdate } = data.site.siteMetadata;
  const { totalCount: videoCount } = data.videos;
  const { totalCount: channelCount } = data.channels;

  return (
    <Footer>
      <p>
        © {new Date().getFullYear()} by <a href="https://twitter.com/joostschuur">Joost Schuur</a> (<a href="https://twitter.com/LearnChineseCLB">@LearnChineseCLB</a>),
      built with <a href="https://www.gatsbyjs.org">Gatsby</a>, hosted on <a href="https://www.netlify.com/">Netlify</a>.
      Last updated: {lastUpdate} ({videoCount} videos, {channelCount} channels).</p>
      <p>Videos are <a href="https://github.com/jschuur/videos.learnchinese.club/">updated</a> every 30 minutes from a curated selection of YouTube channels via the YouTube API. <a href="https://github.com/jschuur/videos.learnchinese.club/labels/bug">Bugs</a> / <a href="https://github.com/jschuur/videos.learnchinese.club/projects/2">Roadmap</a>.</p>
    </Footer>
  )
}