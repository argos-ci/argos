/* eslint-disable import/prefer-default-export */
/* eslint-disable no-underscore-dangle */

import { of } from 'rxjs/observable/of';
import { from } from 'rxjs/observable/from';

export const PROGRESS = 'PROGRESS';
export const SUCCESS = 'SUCCESS';
export const ERROR = 'ERROR';

// Follow the FSA convention.
// https://github.com/acdlite/flux-standard-action#libraries
const createTaskData = (type, state, input, output) => ({
  type,
  payload: {
    state,
    input,
    output,
  },
  error: state === ERROR,
});

export function watchTask(type, selector) {
  return this
    .switchMap(input =>
      from(selector(input))
        .map(output => createTaskData(type, SUCCESS, input, output))
        ._catch(output => of(createTaskData(type, ERROR, input, output)))
        .startWith(createTaskData(type, PROGRESS, input, {})),
    );
}
