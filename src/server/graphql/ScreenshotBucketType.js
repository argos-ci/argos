import {
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLEnumType,
} from 'graphql';
import ScreenshotBucket from 'server/models/ScreenshotBucket';

export const resolve = (source, args) => {
  return ScreenshotBucket
    .query()
    .where({
      id: args.id,
    })
    .then(([screenshotBucket]) => {
      return screenshotBucket;
    });
};

const ScreenshotBucketType = new GraphQLObjectType({
  name: 'ScreenshotBucket',
  fields: {
    id: {
      type: GraphQLID,
    },
    name: {
      type: GraphQLString,
    },
    commit: {
      type: GraphQLString,
    },
    branch: {
      type: GraphQLString,
    },
    jobStatus: {
      type: new GraphQLEnumType({
        name: 'jobBucketStatus',
        values: {
          pending: {
            value: 'pending',
          },
          progress: {
            value: 'progress',
          },
          done: {
            value: 'done',
          },
        },
        description: 'Represent the state of the remote job providing the screenshots',
      }),
    },
    createdAt: {
      type: GraphQLString,
    },
    updatedAt: {
      type: GraphQLString,
    },
  },
});

export default ScreenshotBucketType;
