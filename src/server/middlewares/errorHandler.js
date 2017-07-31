/* eslint-disable no-console */

import expressErr from 'express-err'
import crashReporter from 'modules/crashReporter/common'

export default ({ formatters }) => (err, req, res, next) => {
  crashReporter().errorHandler()(err, req, res, () => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(err, err.stack)
    }

    expressErr({
      exitOnUncaughtException: false,
      formatters,
    })(err, req, res, next)
  })
}
