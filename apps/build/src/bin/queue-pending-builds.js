#!/usr/bin/env node

import { callbackify } from 'util'
import logger from '@argos-ci/logger'
import { Build } from '@argos-ci/database/models'
import { job as buildJob } from '../job'

const main = callbackify(async () => {
  const builds = await Build.query().where({ jobStatus: 'pending' })
  await Promise.all(builds.map(build => buildJob.push(build.id)))
  logger.info(`${builds.length} builds pushed in queue`)
})

main(err => {
  if (err) throw err
  process.kill(process.pid)
})
