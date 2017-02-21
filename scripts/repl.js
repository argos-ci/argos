/* eslint-disable import/no-dynamic-require */
import 'server/bootstrap/setup'

import repl from 'repl'
import path from 'path'
import fs from 'mz/fs'
import { promirepl } from 'promirepl'

const MODEL_DIRECTORY = path.join(__dirname, '../src/server/models')

async function getModels() {
  const models = await fs.readdir(MODEL_DIRECTORY)
  return models.reduce((models, model) => {
    if (model.match(/\.test\.js$/)) {
      return models
    }

    models[model.replace(/\.js$/, '')] = require(path.join(MODEL_DIRECTORY, model)).default
    return models
  }, {})
}

(async () => {
  const models = await getModels()
  const r = repl.start()
  Object.assign(r.context, models)
  promirepl(r)
})().catch(err => setTimeout(() => { throw err }))
