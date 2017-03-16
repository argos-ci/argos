import raven from 'raven'
import pkg from '../package.json'

const noSentry = process.env.ARGOS_CLIENT_SENTRY === 'false'
const DSN = 'https://33b6f7cfa05848f8a1edd6997db57ac1:00e3923d9b874f499e75be04b7dc1b4f@sentry.io/133467'

function setupRaven() {
  raven.config(noSentry ? false : DSN, {
    environment: 'production',
    autoBreadcrumbs: true,
    release: pkg.version,
  })

  if (!noSentry) {
    raven.install()
  }
}

export default setupRaven
