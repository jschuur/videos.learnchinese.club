import React from 'react';
import { Link } from 'gatsby';

import Layout from '../components/Layout';
import SEO from '../components/SEO';

export default () => {
  return (
    <Layout>
      <SEO title="404 Page not found" />

      <p>Oops, page not found!</p>
      <p>
        <Link to="/">Go Back</Link>
      </p>
    </Layout>
  );
};
