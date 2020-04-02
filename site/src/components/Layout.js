import React from "react"
import styled from 'styled-components';

import Footer from './Footer';

const Container = styled.div`
  font-family: Arial, Helvetica, sans-serif;
  width: 80%;
  max-width: 1000px;
  margin: 0 auto;
`;

export default ({ children }) => {
  return (
    <Container>
      { children }

      <Footer />
    </Container>
  )
}