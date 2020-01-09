import '../src/server/bootstrap/setup'
import { teardown } from '../src/server/bootstrap'
import Build from '../src/server/models/Build'
import buildJob from '../src/server/jobs/build'

async function main() {
  const builds = await Build.query().where({ jobStatus: 'pending' })
  await Promise.all(builds.map(build => buildJob.push(build.id)))
  console.log(`${builds.length} builds pushed in queue`)
}

main()
  .then(teardown)
  .catch(error => {
    setTimeout(() => {
      throw error
    })
  })
