import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
} from 'graphql';
import Screenshot from 'server/models/Screenshot';

export const resolve = (source, args) => {
  return Screenshot
    .query()
    .where({
      id: args.id,
    })
    .then(([build]) => {
      return build;
    });
};

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
      type: GraphQLString,
    },
    updatedAt: {
      type: GraphQLString,
    },
  },
});

export default ScreenshotType;
