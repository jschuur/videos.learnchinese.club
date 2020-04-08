import React from "react"
import styled from 'styled-components';

import Footer from './Footer';

const Header = styled.h1`
  text-align: center;
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
      <Header>好好学习天天向上</Header>
      { children }

      <Footer />
    </Container>
  )
}