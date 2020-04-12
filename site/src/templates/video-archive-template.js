import React from 'react'

import Layout from '../components/Layout'
import VideoList from '../components/VideoList';
import Pagination from '../components/Pagination';

export default ({ data, pageContext }) => {
  return (
    <Layout>
        <VideoList videos={ pageContext.videos } />
        <Pagination page={ pageContext.currentPage } numPages={ pageContext.numPages }/>
    </Layout>
  );
}