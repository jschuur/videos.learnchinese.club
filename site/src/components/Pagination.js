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
  font-size: 1.3em;
  padding: 8px 16px;
  vertical-align: middle;
  ${props => props.previous && 'float: left'};
  ${props => props.next && 'float: right'};
`;

const MAX_PAGES = 10;

export default function Pagination({ page }) {
  if(page > 1) {
    var prevLink = (page === 2) ? '/' : `/archive/${ page - 1}`;
  }

  if(page < MAX_PAGES) {
    var nextLink = `/archive/${ page + 1 }`;
  }

  return (
    <div>
      { prevLink && (
        <PaginationButton previous>
          <Link to={ prevLink }>Newer Videos</Link>
        </PaginationButton>
      )}

      { nextLink && (
        <PaginationButton next>
          <Link to={ nextLink }>Older Videos</Link>
        </PaginationButton>
      )}
    </div>
  )
}
