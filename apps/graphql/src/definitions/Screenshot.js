import gql from 'graphql-tag'
import config from '@argos-ci/config'
import { s3 as getS3 } from '@argos-ci/storage'

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
      const s3 = getS3()
      return s3.getSignedUrl('getObject', {
        Bucket: config.get('s3.screenshotsBucket'),
        Key: screenshot.s3Id,
        Expires: 7200,
      })
    },
  },
}
