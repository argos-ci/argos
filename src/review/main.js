import 'core-js'
import React from 'react'
import { render } from 'react-dom'
// import * as Sentry from '@sentry/browser'
import { App } from './App'

if (process.env.NODE_ENV === 'production') {
  // Sentry.init({
  //   dsn: process.env.SENTRY_CLIENT_DSN,
  //   environment: process.env.SENTRY_ENVIRONMENT,
  //   release: process.env.SENTRY_RELEASE,
  // })
}

const renderRoot = () => {
  render(<App />, document.querySelector('#root'))
}

renderRoot()
