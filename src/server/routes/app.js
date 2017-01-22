/* eslint-disable no-console */
import path from 'path'
import express from 'express'
import compress from 'compression'
import morgan from 'morgan'
import ejs from 'ejs'
import subdomain from 'express-subdomain'
import errorHandler from 'express-err'
import config from 'config'
import csp from 'server/middlewares/csp'
import www from 'server/routes/www'
import api from 'server/routes/api'

const app = express()
app.disable('x-powered-by')
app.engine('html', ejs.renderFile)
app.set('views', path.join(__dirname, '..'))

if (config.get('server.logFormat')) {
  app.use(morgan(config.get('server.logFormat')))
}

app.use(compress())
app.use(csp) // Content Security Policy
app.use(subdomain('www', www))
app.use(subdomain('api', api))

// Log errors
app.use((err, req, res, next) => {
  console.log(err, err.stack)
  next(err)
})

// Display errors
app.use(errorHandler({
  exitOnUncaughtException: false,
  formatters: ['json'],
}))

export default app
