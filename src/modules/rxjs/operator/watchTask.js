/* eslint-disable import/prefer-default-export */
/* eslint-disable no-underscore-dangle */

import { of } from 'rxjs/observable/of';
import { from } from 'rxjs/observable/from';

const PROGRESS = 'progress';
const SUCCESS = 'success';
const ERROR = 'error';

// Follow the FSA convention.
// https://github.com/acdlite/flux-standard-action#libraries
const createTaskData = (type, state, input, output) => ({
  type,
  payload: output,
  error: state === ERROR,
  meta: {
    state,
    input,
  },
});

export function watchTask(type, selector) {
  return this
    .switchMap(input =>
      from(selector(input))
        .map(output => createTaskData(type, SUCCESS, input, output))
        ._catch(output => of(createTaskData(type, ERROR, input, output)))
        .startWith(createTaskData(type, PROGRESS, input)),
    );
}
