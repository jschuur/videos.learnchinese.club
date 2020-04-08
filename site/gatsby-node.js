const path = require("path")
const { createFilePath } = require("gatsby-source-filesystem")

exports.createPages = async ({ graphql, actions, reporter }) => {
  const { createPage } = actions
  const result = await graphql(
    `
      query VideoArchiveQuery {
        allMongodbChineseyoutubeVideos(
          limit: 300
          sort: {
            fields: [published_at]
            order: DESC
          }
        ) {
          nodes {
            id
            video_id
            author
            title
            link
            published_at
            content_details {
              duration
            }
          }
        }
      }
    `
  )
  if (result.errors) {
    reporter.panicOnBuild(`Error while running GraphQL query.`)
    return
  }

  const videos = result.data.allMongodbChineseyoutubeVideos.nodes
  const videosPerPage = 30
  const numPages = Math.ceil(videos.length / videosPerPage)

  Array.from({ length: numPages }).forEach((_, i) => {
    createPage({
      path: i === 0 ? `/archive` : `/archive/${i + 1}`,
      component: path.resolve("./src/templates/video-archive-template.js"),
      context: {
        limit: videosPerPage,
        skip: i * videosPerPage,
        numPages,
        currentPage: i + 1,
      },
    })
  })
}
exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions
  if (node.internal.type === `MongodbChineseyoutubeVideos`) {
    const value = createFilePath({ node, getNode })
    createNodeField({
      node,
      value,
    })
  }
}