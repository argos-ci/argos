import 'core-js'
import React from 'react'
import { render } from 'react-dom'
import * as Sentry from '@sentry/browser'
import configBrowser from 'configBrowser'
import { App } from './App'

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: configBrowser.get('sentry.clientDsn'),
    environment: configBrowser.get('sentry.environment'),
    release: configBrowser.get('releaseVersion'),
  })
}

const renderRoot = () => {
  render(<App />, document.querySelector('#root'))
}

renderRoot()
