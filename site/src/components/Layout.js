import React from "react"
import styled from 'styled-components';
import { Link } from "gatsby"

import Footer from './Footer';

const Header = styled.h1`
  text-align: center;
  font-size: 2.1rem;

  a {
    color: black;
    text-decoration: none;
  }
`;

const Container = styled.div`
  font-family: Arial, Helvetica, sans-serif;
  width: 80%;
  max-width: 1000px;
  margin: 0 auto;
`;

export default ({ children }) => {
  return (
    <Container>
      <Header><Link to="/">好好学习天天向上</Link></Header>
      { children }

      <Footer />
    </Container>
  )
}