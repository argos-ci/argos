/* eslint-disable no-console */
import path from 'path'
import express from 'express'
import compress from 'compression'
import morgan from 'morgan'
import ejs from 'ejs'
import subdomain from 'express-subdomain'
import errorHandler from 'express-err'
import config from 'config'
import crashReporter, { captureClientRelease } from 'modules/crashReporter/crashReporter'
import csp from 'server/middlewares/csp'
import www from 'server/routes/www'
import api from 'server/routes/api'

const app = express()
app.disable('x-powered-by')
app.engine('html', ejs.renderFile)
app.set('trust proxy', 1)
app.set('views', path.join(__dirname, '..'))

app.use(captureClientRelease())
app.use(crashReporter.requestHandler())

if (config.get('server.logFormat')) {
  app.use(morgan(config.get('server.logFormat')))
}

app.use(compress())
app.use(csp) // Content Security Policy

// Redirect from http to https
if (config.get('server.secure')) {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      res.redirect(`https://${req.hostname}${req.url}`)
    } else {
      next() /* Continue to other routes if we're not redirecting */
    }
  })
}

// Public directory
app.use(express.static(path.join(__dirname, '../../../server/public'), {
  etag: true,
  lastModified: false,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-cache')
  },
}))

app.use(subdomain('www', www))
app.use(subdomain('api', api))

app.use(crashReporter.errorHandler())

// Log errors
if (config.get('env') !== 'test') {
  app.use((err, req, res, next) => {
    console.log(err, err.stack)
    next(err)
  })
}

// Display errors
app.use(errorHandler({
  exitOnUncaughtException: false,
  formatters: ['json'],
}))

export default app
