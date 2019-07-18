/* eslint-env browser */

import 'core-js/stable'
import 'regenerator-runtime/runtime'

import 'modules/rxjs'
import React from 'react'
import { render } from 'react-dom'
import { initializeCrashReporterClient } from 'modules/crashReporter/client'
import Root from 'review/Root'

initializeCrashReporterClient()

const renderRoot = () => {
  render(<Root />, document.querySelector('#root'))
}

renderRoot()
