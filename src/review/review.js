import 'modules/rxjs'
import React from 'react'
import { render } from 'react-dom'
import { AppContainer } from 'react-hot-loader'
import { initializeCrashReporterClient } from 'modules/crashReporter/client'
import Root from 'review/Root'

initializeCrashReporterClient()

const renderRoot = () => {
  render(
    <AppContainer>
      <Root />
    </AppContainer>,
    document.querySelector('#root')
  )
}

renderRoot()

// Hot Module Replacement API
if (module.hot) {
  // The webpack docs say to use the following but jss hot reloading isnt working
  // module.hot.accept('./Root', renderRoot);
  module.hot.accept('./Root', () => {
    const NextRoot = require('./Root').default // eslint-disable-line global-require

    render(
      <AppContainer>
        <NextRoot />
      </AppContainer>,
      document.querySelector('#root')
    )
  })
}
