import React from 'react';
import styled from 'styled-components';
import { Link } from 'gatsby';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight, faChevronLeft } from '@fortawesome/free-solid-svg-icons';

const PaginationButton = styled.div`
  a {
    text-decoration: none;
  }

  a {
    color: black;
  }

  border: 1px solid darkgrey;
  border-radius: 10px;
  background-color: lemonchiffon;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
  font-size: 1.1em;
  padding: 8px 16px;
  vertical-align: middle;
  margin: 0 20px;
`;

const PaginationWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 20px 0 30px 0;
`;

export default function Pagination({ page, numPages }) {
  let newerLink, olderLink;

  if (page > 1) {
    newerLink = page === 2 ? '/' : `/page/${page - 1}`;
  }

  if (page < numPages) {
    olderLink = `/page/${page + 1}`;
  }

  return (
    <PaginationWrapper>
      {newerLink ? (
        <PaginationButton next>
          <Link to={newerLink}>
            <FontAwesomeIcon pull="left" icon={faChevronLeft} />
            Newer Videos
          </Link>
        </PaginationButton>
      ) : (
        <div />
      )}

      {olderLink ? (
        <PaginationButton previous>
          <Link to={olderLink}>
            Older Videos
            <FontAwesomeIcon pull="right" icon={faChevronRight} />
          </Link>
        </PaginationButton>
      ) : (
        <div />
      )}
    </PaginationWrapper>
  );
}
