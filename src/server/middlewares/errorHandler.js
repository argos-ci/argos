/* eslint-disable no-console */
import expressErr from 'express-err'
import crashReporter from 'modules/crashReporter/crashReporter'
import config from 'config'

export default ({ formatters }) => (err, req, res, next) => {
  crashReporter.errorHandler()(err, req, res, () => {
    if (config.get('env') !== 'test') {
      console.log(err, err.stack)
    }

    expressErr({
      exitOnUncaughtException: false,
      formatters,
    })(err, req, res, next)
  })
}
