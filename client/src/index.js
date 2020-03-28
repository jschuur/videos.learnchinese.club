import React from "react";
import ReactDOM from "react-dom";
import styled from 'styled-components';

import VideoList from './components/VideoList';

const Container = styled.div`
  width: 80%;
  max-width: 1000px;
  margin: 0 auto;
`;

function App() {
  return (
    <Container>
      <h1>Latest Videos</h1>
      <VideoList />
    </Container>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));