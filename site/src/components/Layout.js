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
`;

const Layout = ({ children }) => {
  const data = useStaticQuery(graphql`
    query SiteTitleQuery {
      site {
        siteMetadata {
          lastUpdate
        }
      }
    }
  `)
  const { lastUpdate } = data.site.siteMetadata

  return (
    <Container>
      { children }

      <Footer>
        © {new Date().getFullYear()} by <a href="https://twitter.com/joostschuur">Joost Schuur</a>.
        Built with {` `} <a href="https://www.gatsbyjs.org">Gatsby</a>, last updated: { lastUpdate }.
      </Footer>
      </Container>
  )
}
export default Layout
