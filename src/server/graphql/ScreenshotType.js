import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
} from 'graphql'
import GraphQLDateType from 'graphql-custom-datetype'
import Screenshot from 'server/models/Screenshot'

export const resolve = (source, args) => {
  return Screenshot
    .query()
    .where({
      id: args.id,
    })
    .then(([build]) => {
      return build
    })
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
      type: GraphQLDateType,
    },
    updatedAt: {
      type: GraphQLDateType,
    },
  },
})

export default ScreenshotType
