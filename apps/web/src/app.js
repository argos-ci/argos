/* eslint-disable no-console */
import * as Sentry from '@sentry/node'
import path from 'path'
import express from 'express'
import compress from 'compression'
import morgan from 'morgan'
import helmet from 'helmet'
import ejs from 'ejs'
// import subdomain from 'express-subdomain'
import config from '@argos-ci/config'
import www from './www'
import api from './api'

const app = express()
app.disable('x-powered-by')
app.engine('html', ejs.renderFile)
app.set('trust proxy', 1)
app.set('views', path.join(__dirname, '..'))

app.use(function captureClientRelease(req, res, next) {
  if (req.headers['x-argos-release-version']) {
    Sentry.configureScope((scope) => {
      scope.setTag(
        'clientReleaseVersion',
        req.headers['x-argos-release-version'],
      )
    })
  } else if (req.headers['x-argos-cli-version']) {
    Sentry.configureScope((scope) => {
      scope.setTag('clientCliVersion', req.headers['x-argos-cli-version'])
    })
  }

  next()
})

app.use(Sentry.Handlers.requestHandler())

if (config.get('server.logFormat')) {
  app.use(morgan(config.get('server.logFormat')))
}

app.use(compress())

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
app.use(
  express.static(path.join(__dirname, '../../../public'), {
    etag: true,
    lastModified: false,
    setHeaders: (res) => {
      res.set('Cache-Control', 'no-cache')
    },
  }),
)

app.use(
  helmet({
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
    // TODO Should we restrict the policy ?
    contentSecurityPolicy: {
      directives: {
        // Blob for the upload page
        defaultSrc: ['*', 'blob:'],
        styleSrc: ['*', "'unsafe-inline'"],
        scriptSrc: ['*', "'unsafe-inline'", "'unsafe-eval'"],
        frameAncestors: ["'none'"], // Disallow embedding of content
      },
      // Don't support old version and help with CDN
      browserSniff: false,
      disableAndroid: true,
    },
    frameguard: {
      action: 'deny', // Disallow embedded iframe
    },
  }),
)

app.use(api, www)

// if (config.get('www.subdomain') === config.get('api.subdomain')) {
//   app.use(api, www)
// } else {
//   app.use(subdomain(config.get('api.subdomain'), api))
//   app.use(subdomain(config.get('www.subdomain'), www))
// }

export default app
