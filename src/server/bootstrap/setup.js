/* eslint-disable no-console */

import AWS from 'aws-sdk'
import * as Sentry from '@sentry/node'
import config from 'config'
import { connect as connectDatabase } from 'server/services/database'
import handleKillSignals from 'server/bootstrap/handleKillSignals'

// Initialize sentry
Sentry.init({
  dsn: config.get('sentry.serverDsn'),
  environment: config.get('sentry.environment'),
  release: config.get('releaseVersion'),
})

AWS.config.setPromisesDependency(Promise)

connectDatabase()
handleKillSignals()
