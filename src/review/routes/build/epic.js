import actionTypes from 'redux/actionTypes';
import graphQLClient from 'modules/graphQL/client';

const buildEpic = action$ =>
  action$
    .ofType(actionTypes.BUILD_FETCH)
    .watchTask(actionTypes.BUILD_FETCH_TASK, () => (
      graphQLClient.fetch({
        query: `{
          build(id: 1) {
            baseScreenshotBucket {
              id
              name
              commit
              jobStatus
            }
            compareScreenshotBucket {
              id
              name
              commit
              jobStatus
            }
          }
        }`,
      })
    ));

export default buildEpic;
