import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
} from 'graphql'
import graphQLDateTime from 'modules/graphQL/graphQLDateTime'
import Screenshot from 'server/models/Screenshot'

export function resolve(source, args) {
  return Screenshot
    .query()
    .findById(args.id)
}

const ScreenshotType = new GraphQLObjectType({
  name: 'Screenshot',
  fields: {
    id: {
      type: GraphQLID,
    },
    screenshotBucketId: {
      type: GraphQLString,
    },
    name: {
      type: GraphQLString,
    },
    s3Id: {
      type: GraphQLString,
    },
    createdAt: {
      type: graphQLDateTime,
    },
    updatedAt: {
      type: graphQLDateTime,
    },
  },
})

export default ScreenshotType
