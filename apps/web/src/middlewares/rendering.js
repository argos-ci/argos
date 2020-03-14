/* eslint-disable global-require, no-console, import/no-unresolved */

import ejs from 'ejs'
import fs from 'fs'
import path from 'path'
import { pick } from 'lodash'
import config from '@argos-ci/config'
import { getAuthorizationStatus } from '../authorizations'

let htmlWebpackPlugin
const indexString = fs.readFileSync(
  path.join(__dirname, '../../templates/index.ejs'),
  'UTF-8',
)

if (process.env.NODE_ENV === 'production') {
  const assets = require('../../../app/dist/assets.json')

  htmlWebpackPlugin = {
    files: {
      css: [assets.main.css],
      js: [assets.main.js],
    },
  }
} else {
  htmlWebpackPlugin = {
    files: {
      js: ['/static/app/main.js'],
    },
  }
}

function isMediaBot(userAgent) {
  let output = false

  if (
    userAgent &&
    (userAgent.indexOf('facebookexternalhit') !== -1 ||
      userAgent.indexOf('Twitterbot') !== -1)
  ) {
    output = true
  }

  return output
}

function injectJSON(data) {
  return JSON.stringify(
    data,
    null,
    process.env.NODE_ENV === 'production' ? 0 : 2,
  )
}

export function rendering(additionalClientData) {
  return (req, res) => {
    const output = ejs.render(indexString, {
      cache: true,
      filename: 'review/index.ejs',
      isMediaBot: isMediaBot(req.headers['user-agent']),
      htmlWebpackPlugin,
      config,
      clientData: injectJSON({
        config: {
          sentry: {
            environment: config.get('sentry.environment'),
            clientDsn: config.get('sentry.clientDsn'),
          },
          releaseVersion: config.get('releaseVersion'),
          github: {
            applicationUrl: config.get('github.applicationUrl'),
          },
        },
        ...(req.user
          ? {
              authorizationStatus: getAuthorizationStatus(req.user),
              user: pick(
                req.user,
                'name',
                'email',
                'login',
                'privateSync',
                'scopes',
              ),
            }
          : {
              user: null,
            }),
        ...additionalClientData,
      }),
    })

    res.status(200).send(output)
  }
}
