import React from "react"
import { useStaticQuery, graphql } from "gatsby"
import styled from 'styled-components';

const Footer = styled.footer`
  margin-top: 20px;
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
      © {new Date().getFullYear()} by <a href="https://twitter.com/joostschuur">Joost Schuur</a> (<a href="https://twitter.com/LearnChineseCLB">@LearnChineseCLB</a>),
      built with <a href="https://www.gatsbyjs.org">Gatsby</a>.
      Last updated: { lastUpdate } ({videoCount} videos, {channelCount} channels)
    </Footer>
  )
}