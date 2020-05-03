export function getVideoThumbnail(videoId, resolution) {
  const resolutions = {
    default: { prefix: '', width: 120, height: 90 },
    medium: { prefix: 'mq', width: 320, height: 180 },
    high: { prefix: 'hq', width: 480, height: 360 },
    standard: { prefix: 'sd', width: 640, height: 480 },
    maxres: { prefix: 'maxres', width: 1280, height: 720 }
  };

  const { prefix, width, height } = resolutions[resolution];

  return {
    url: `https://i.ytimg.com/vi/${videoId}/${prefix}default.jpg`,
    width,
    height
  };
}

// Needed, since gatsby-source-mongodb won't import mongoDB relationships:
// https://github.com/gatsbyjs/gatsby/pull/12774#issuecomment-480960564
export function populateRelationships({ parents, children, foreignKey }) {
  const parentRefs = parents.reduce(
    (acc, { mongodb_id: ref, ...data }) => ({ ...acc, [ref]: data }),
    {}
  );

  children.forEach((child) => (child[foreignKey] = parentRefs[child[foreignKey]]));

  return children;
}
