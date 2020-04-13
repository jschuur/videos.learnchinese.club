import React from 'react'

import Layout from '../components/Layout'
import VideoList from '../components/VideoList';
import Pagination from '../components/Pagination';
import SEO from '../components/SEO';

export default ({ data, pageContext: { videos, currentPage, numPages }}) => {
  return (
    <Layout>
        <SEO title={`Archive (Page ${currentPage})`} />
        <VideoList videos={ videos } />
        <Pagination page={ currentPage } numPages={ numPages }/>
    </Layout>
  );
}