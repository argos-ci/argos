/* eslint-disable global-require, no-console, import/no-unresolved */

import ejs from 'ejs'
import fs from 'fs'
import path from 'path'
import { minify } from 'html-minifier'
import config from 'config'
import { pick } from 'lodash'
import getAuthorizationStatus from 'modules/authorizations/getAuthorizationStatus'
import theme from 'modules/styles/theme'

let htmlWebpackPlugin
let indexString = fs.readFileSync(path.join(__dirname, '../../review/index.ejs'), 'UTF-8')

if (process.env.NODE_ENV === 'production') {
  const assets = require('../../../server/static/review/assets.json')

  indexString = minify(indexString, {
    collapseWhitespace: true,
    removeComments: true,
    minifyJS: true,
  })

  htmlWebpackPlugin = {
    files: {
      css: [assets.main.css],
      js: [assets.main.js],
    },
  }
} else {
  htmlWebpackPlugin = {
    files: {
      js: ['/browser.js'],
    },
  }
}

function isMediaBot(userAgent) {
  let output = false

  if (
    userAgent &&
    (userAgent.indexOf('facebookexternalhit') !== -1 || userAgent.indexOf('Twitterbot') !== -1)
  ) {
    output = true
  }

  return output
}

function injectJSON(data) {
  return JSON.stringify(data, null, process.env.NODE_ENV === 'production' ? 0 : 2)
}

export default additionalClientData => (req, res) => {
  const output = ejs.render(indexString, {
    cache: true,
    filename: 'review/index.ejs',
    isMediaBot: isMediaBot(req.headers['user-agent']),
    htmlWebpackPlugin,
    config,
    theme,
    clientData: injectJSON({
      config: {
        s3: {
          screenshotsBucket: config.get('s3.screenshotsBucket'),
        },
        releaseVersion: config.get('releaseVersion'),
        github: {
          applicationUrl: config.get('github.applicationUrl'),
        },
      },
      ...(req.user
        ? {
            authorizationStatus: getAuthorizationStatus(req.user),
            user: pick(req.user, 'name', 'email', 'login', 'privateSync', 'scopes'),
          }
        : {
            user: null,
          }),
      ...additionalClientData,
    }),
  })

  res.status(200).send(output)
}
