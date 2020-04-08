import React from 'react'
import styled from 'styled-components';
import { Link } from 'gatsby'

const PaginationButton = styled.div`
  a {
    text-decoration: none;
  }

  a {
    color: black;
  }

  border: 1px solid black;
  font-size: 1.1em;
  padding: 8px 16px;
  vertical-align: middle;
  margin: 0 20px;
  /* ${props => props.previous && 'float: left'};
  ${props => props.next && 'float: right'}; */
`;

const PaginationWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 20px 0;
`;

const MAX_PAGES = 10;

export default function Pagination({ page }) {
  if(page > 1) {
    var newerLink = (page === 2) ? '/' : `/archive/${ page - 1}`;
  }

  if(page < MAX_PAGES) {
    var olderLink = `/archive/${ page + 1 }`;
  }

  // TODO: Improve button layout (and buttons)
  return (
    <PaginationWrapper>
      { newerLink ? (
        <PaginationButton next>
          <Link to={ newerLink }>Newer Videos</Link>
        </PaginationButton>
      ) : (<div></div>)}

      { olderLink ? (
        <PaginationButton previous>
          <Link to={ olderLink }>Older Videos</Link>
        </PaginationButton>
      ) : (<div></div>)}
    </PaginationWrapper>
  )
}
