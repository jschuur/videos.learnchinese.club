import React from "react"
import { useStaticQuery, graphql } from "gatsby"
import styled from 'styled-components';

const Container = styled.div`
  font-family: Arial, Helvetica, sans-serif;
  width: 80%;
  max-width: 1000px;
  margin: 0 auto;
`;

const Footer = styled.div`
  margin-top: 20px;
  font-size: 0.8rem;
  color: grey;
  text-align: center;
`;

const Layout = ({ children }) => {
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
    <Container>
      { children }

      <Footer>
        © {new Date().getFullYear()} by <a href="https://twitter.com/joostschuur">Joost Schuur</a>,
        built with <a href="https://www.gatsbyjs.org">Gatsby</a>.
        Last updated: { lastUpdate } ({videoCount} videos, {channelCount} channels)
      </Footer>
      </Container>
  )
}
export default Layout
