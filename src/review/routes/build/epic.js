import actionTypes from 'redux/actionTypes';
import graphQLClient from 'modules/graphQL/client';

const buildEpic = action$ =>
  action$
    .ofType(actionTypes.BUILD_FETCH)
    .watchTask(actionTypes.BUILD_FETCH_TASK, () => (
      graphQLClient.fetch({
        query: `{
          hello
        }`,
      })
    ));

export default buildEpic;
