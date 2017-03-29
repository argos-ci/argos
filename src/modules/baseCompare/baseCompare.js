import GitHubAPI from 'github'
import config from 'config'
import crashReporter from 'modules/crashReporter/crashReporter'
import ScreenshotBucket from 'server/models/ScreenshotBucket'

async function fallbackToMaster(build) {
  const bucket = await ScreenshotBucket.query()
    .where({
      branch: 'master',
      repositoryId: build.repository.id,
    })
    .whereNot({
      id: build.compareScreenshotBucket.id,
    })
    .orderBy('id', 'desc')
    .limit(1)
    .first()

  return bucket || null
}

async function getBaseScreenshotBucket({
  forkCommit,
  potentialCommits,
  build,
}) {
  if (!forkCommit) {
    return fallbackToMaster(build)
  }

  const potentialCommitShas = potentialCommits.map(commit => commit.sha)
  const buckets = await ScreenshotBucket.query()
    .where({ repositoryId: build.repository.id })
    .whereIn('commit', potentialCommitShas)

  // Reverse the potentialCommits order.
  buckets.sort((bucketA, bucketB) => (
    potentialCommitShas.indexOf(bucketB.commit) -
    potentialCommitShas.indexOf(bucketA.commit)
  ))

  return buckets[0] || fallbackToMaster(build)
}

async function baseCompare({
  baseCommit,
  compareCommit,
  build,
  perPage = 30,
}) {
  build = await build.$query().eager('[repository, compareScreenshotBucket]')
  const user = await build.repository.getUsers().limit(1).first()

  if (!user) {
    return fallbackToMaster(build)
  }

  const owner = await build.repository.getOwner()
  const github = new GitHubAPI({ debug: config.get('env') === 'development' })
  github.authenticate({
    type: 'oauth',
    token: user.accessToken,
  })

  let baseCommits = []
  let compareCommits = []

  try {
    // http://stackoverflow.com/questions/9179828/github-api-retrieve-all-commits-for-all-branches-for-a-repo
    // http://mikedeboer.github.io/node-github/#api-repos-getBranch
    baseCommits = await github.repos.getCommits({
      owner: owner.login,
      repo: build.repository.name,
      sha: baseCommit,
      per_page: perPage,
      page: 1,
    })
    baseCommits = baseCommits.data

    compareCommits = await github.repos.getCommits({
      owner: owner.login,
      repo: build.repository.name,
      sha: compareCommit,
      per_page: perPage,
      page: 1,
    })
    compareCommits = compareCommits.data
  } catch (error) {
    crashReporter.captureException(error)
  }

  const potentialCommits = []
  const forkCommit = baseCommits.find((baseCommit, index) => {
    const comparingWithHimself = baseCommit.sha === compareCommit

    // We can't compare with ourself.
    if (!comparingWithHimself) {
      potentialCommits.push(baseCommit)
    }

    const found = compareCommits.some(compareCommit => (
      baseCommit.sha === compareCommit.sha
    ))

    // Takes the previous commit too.
    if (found && comparingWithHimself && index + 1 < baseCommits.length) {
      potentialCommits.push(baseCommits[index + 1])
    }

    return found
  })

  const baseScreenshotBucket = await getBaseScreenshotBucket({
    forkCommit,
    potentialCommits,
    build,
  })

  return baseScreenshotBucket
}

export default baseCompare
