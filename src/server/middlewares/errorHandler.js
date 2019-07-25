/* eslint-disable no-console */

import * as Sentry from '@sentry/node'
import expressErr from 'express-err'

export default ({ formatters }) => [
  Sentry.Handlers.errorHandler(),
  // eslint-disable-next-line no-unused-vars
  (err, req, res, next) => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(err, err.stack)
    }
  },
  expressErr({
    exitOnUncaughtException: false,
    formatters,
  }),
]
