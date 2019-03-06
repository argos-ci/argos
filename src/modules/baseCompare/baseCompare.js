import GitHubAPI from 'github'
import config from 'config'
import crashReporter from 'modules/crashReporter/common'
import ScreenshotBucket from 'server/models/ScreenshotBucket'

async function fallbackToMaster(build) {
  const bucket = await ScreenshotBucket.query()
    .where({
      branch: build.repository.baselineBranch,
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

async function getBaseScreenshotBucket({ potentialCommits, build }) {
  const potentialCommitShas = potentialCommits.map(commit => commit.sha)
  const buckets = await ScreenshotBucket.query()
    .where({ repositoryId: build.repository.id })
    .whereIn('commit', potentialCommitShas)

  // Reverse the potentialCommits order.
  buckets.sort(
    (bucketA, bucketB) =>
      potentialCommitShas.indexOf(bucketB.commit) - potentialCommitShas.indexOf(bucketA.commit)
  )

  return buckets[0] || fallbackToMaster(build)
}

async function baseCompare({ baseCommit, compareCommit, build, perPage = 100 }) {
  build = await build.$query().eager('[repository, compareScreenshotBucket]')
  const user = await build.repository
    .getUsers()
    .limit(1)
    .first()

  // We can't use Github information without a user.
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
  const baseCommitParams = {
    owner: owner.login,
    repo: build.repository.name,
    sha: baseCommit,
    per_page: perPage,
    page: 1,
  }

  try {
    // http://stackoverflow.com/questions/9179828/github-api-retrieve-all-commits-for-all-branches-for-a-repo
    // http://mikedeboer.github.io/node-github/#api-repos-getBranch
    baseCommits = await github.repos.getCommits(baseCommitParams)
    baseCommits = baseCommits.data
  } catch (error) {
    // Unauthorized
    if (error.code !== 401) {
      crashReporter().captureException(error, {
        extra: {
          baseCommitParams,
        },
      })
    }
  }

  const compareCommitPararms = {
    owner: owner.login,
    repo: build.repository.name,
    sha: compareCommit,
    per_page: perPage,
    page: 1,
  }

  try {
    compareCommits = await github.repos.getCommits(compareCommitPararms)
    compareCommits = compareCommits.data
  } catch (error) {
    // Unauthorized
    if (error.code !== 401) {
      crashReporter().captureException(error, {
        extra: {
          compareCommitPararms,
        },
      })
    }
  }

  let potentialCommits = []
  const forkCommit = baseCommits.find((baseCommit, index) => {
    const comparingWithHimself = baseCommit.sha === compareCommit

    // We can't compare with ourself.
    if (!comparingWithHimself) {
      potentialCommits.push(baseCommit)
    }

    const found = compareCommits.some(compareCommit => baseCommit.sha === compareCommit.sha)

    // Takes the previous commit too.
    if (found && comparingWithHimself && index + 1 < baseCommits.length) {
      potentialCommits.push(baseCommits[index + 1])
    }

    return found
  })

  // We can't find a fork commit, we miss history information.
  // Let's use the oldest base bucket from master we can find.
  if (!forkCommit) {
    potentialCommits = baseCommits
  }

  const baseScreenshotBucket = await getBaseScreenshotBucket({
    potentialCommits,
    build,
  })

  return baseScreenshotBucket
}

export default baseCompare
