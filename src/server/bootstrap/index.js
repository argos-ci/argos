/* eslint-disable no-console */

import AWS from 'aws-sdk'
import * as Sentry from '@sentry/node'
import config from 'config'
import { connect as connectDatabase } from '../services/database'
import { disconnect } from '../services/all'
import { handleKillSignals } from './handleKillSignals'

export function setup() {
  // Initialize sentry
  if (config.get('env') === 'production') {
    Sentry.init({
      dsn: config.get('sentry.serverDsn'),
      environment: config.get('sentry.environment'),
      release: config.get('releaseVersion'),
    })
  }

  AWS.config.setPromisesDependency(Promise)

  connectDatabase()
  handleKillSignals()
}

export function teardown() {
  disconnect()
}
