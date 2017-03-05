/* eslint-disable import/no-dynamic-require */
import 'server/bootstrap/setup'

import repl from 'repl'
import path from 'path'
import fs from 'mz/fs'
import { promirepl } from 'promirepl'
import clearRequire from 'clear-require'

const MODEL_DIRECTORY = path.join(__dirname, '../src/server/models')
const JOB_DIRECTORY = path.join(__dirname, '../src/server/jobs')

;(async () => {
  const r = repl.start()

  async function getModels() {
    const models = await fs.readdir(MODEL_DIRECTORY)
    return models.reduce((models, model) => {
      if (model.match(/\.test\.js$/) || !model.match(/\.js$/)) {
        return models
      }

      models[model.replace(/\.js$/, '')] = require(path.join(MODEL_DIRECTORY, model)).default
      return models
    }, {})
  }

  async function getJobs() {
    const jobs = await fs.readdir(JOB_DIRECTORY)
    return jobs.reduce((jobs, job) => {
      if (job.match(/\.test\.js$/)) {
        return jobs
      }

      jobs[job.replace(/\.js$/, 'Job')] = require(path.join(JOB_DIRECTORY, job)).default
      return jobs
    }, {})
  }

  const reload = async () => {
    console.log('Loading...') // eslint-disable-line no-console
    clearRequire.match(new RegExp(MODEL_DIRECTORY))
    const models = await getModels()
    const jobs = await getJobs()
    Object.assign(r.context, models, jobs, { reload })
    console.log('Loaded!') // eslint-disable-line no-console
  }

  await reload()
  promirepl(r)
})().catch(err => setTimeout(() => { throw err }))
