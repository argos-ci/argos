import gql from 'graphql-tag'
import { getS3Client } from 'server/services/s3'
import config from 'config'

export const typeDefs = gql`
  type Screenshot {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    name: String!
    url: String!
  }
`

export const resolvers = {
  Screenshot: {
    url(screenshot) {
      const s3 = getS3Client()
      return s3.getSignedUrl('getObject', {
        Bucket: config.get('s3.screenshotsBucket'),
        Key: screenshot.s3Id,
        Expires: 7200,
      })
    },
  },
}
