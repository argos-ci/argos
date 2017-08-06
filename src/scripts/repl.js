/* eslint-disable import/no-dynamic-require, global-require */

import 'server/bootstrap/setup'
// --- Post bootstrap -----
import repl from 'repl' // https://nodejs.org/api/repl.html
import path from 'path'
import { promisify } from 'util'
import { readdir } from 'fs'
import { promirepl } from 'promirepl'
import clearRequire from 'clear-require'

const readdirAsync = promisify(readdir)
const MODEL_DIRECTORY = path.join(__dirname, '../src/server/models')
const JOB_DIRECTORY = path.join(__dirname, '../src/server/jobs')
;(async () => {
  const replServer = repl.start()

  async function getModels() {
    return (await readdirAsync(MODEL_DIRECTORY)).reduce((models, model) => {
      if (model.match(/\.test\.js$/) || !model.match(/\.js$/)) {
        return models
      }

      return {
        ...models,
        [model.replace(/\.js$/, '')]: require(path.join(MODEL_DIRECTORY, model)).default,
      }
    }, {})
  }

  async function getJobs() {
    return (await readdirAsync(JOB_DIRECTORY)).reduce((jobs, job) => {
      if (job.match(/\.test\.js$/)) {
        return jobs
      }

      return {
        ...jobs,
        [job.replace(/\.js$/, 'Job')]: require(path.join(JOB_DIRECTORY, job)).default,
      }
    }, {})
  }

  const reload = async () => {
    console.log('Loading...') // eslint-disable-line no-console
    clearRequire.match(new RegExp(MODEL_DIRECTORY))
    const models = await getModels()
    const jobs = await getJobs()
    Object.assign(replServer.context, models, jobs, { reload })
    console.log('Loaded!') // eslint-disable-line no-console
  }

  await reload()

  // https://github.com/building5/node-promirepl
  promirepl(replServer)
})().catch(err =>
  setTimeout(() => {
    throw err
  })
)
