// @flow weak
/* eslint-disable no-console */

import ejs from 'ejs';
import fs from 'fs';
import path from 'path';
import { minify } from 'html-minifier';
import config from 'config';

let htmlWebpackPlugin;
let indexString = fs.readFileSync(path.join(__dirname, '../../review/index.ejs'), 'UTF-8');

if (process.env.NODE_ENV === 'production') {
  const assets = require('../../../server/static/review/assets.json');

  indexString = minify(indexString, {
    collapseWhitespace: true,
    removeComments: true,
    minifyJS: true,
  });

  htmlWebpackPlugin = {
    files: {
      css: [assets.main.css],
      js: [assets.main.js],
    },
  };
} else {
  htmlWebpackPlugin = {
    files: {
      js: ['/browser.js'],
    },
  };
}

function isMediaBot(userAgent) {
  let output = false;

  if (userAgent && (
    userAgent.indexOf('facebookexternalhit') !== -1 ||
    userAgent.indexOf('Twitterbot') !== -1
    )) {
    output = true;
  }

  return output;
}

export default (req, res) => {
  const output = ejs.render(indexString, {
    cache: true,
    filename: 'review/index.ejs',
    isMediaBot: isMediaBot(req.headers['user-agent']),
    htmlWebpackPlugin,
    config,
  });

  res.status(200).send(output);
};
