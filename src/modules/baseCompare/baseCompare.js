import * as Sentry from '@sentry/node'
import GitHubAPI from 'github'
import config from 'config'
import ScreenshotBucket from 'server/models/ScreenshotBucket'

async function getLatestMasterBucket(build) {
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

async function getBaseScreenshotBucket({ commits, build }) {
  // We hope we will have a build of Argos from the latest 5 commits
  // no need to ask for more, we will run out of memory
  const shas = commits.map(commit => commit.sha).slice(0, 5)
  const buckets = await ScreenshotBucket.query()
    .where({
      repositoryId: build.repository.id,
      branch: build.repository.baselineBranch,
    })
    .whereIn('commit', shas)

  // Sort buckets from the most recent commit to the oldest one
  buckets.sort(
    (bucketA, bucketB) =>
      shas.indexOf(bucketA.commit) - shas.indexOf(bucketB.commit),
  )

  return buckets[0] || getLatestMasterBucket(build)
}

async function getCommits({ github, owner, repo, sha, perPage }) {
  const params = {
    owner,
    repo,
    sha,
    per_page: perPage,
    page: 1,
  }

  try {
    // http://stackoverflow.com/questions/9179828/github-api-retrieve-all-commits-for-all-branches-for-a-repo
    // http://mikedeboer.github.io/node-github/#api-repos-getBranch
    const response = await github.repos.getCommits(params)
    return response.data
  } catch (error) {
    // Unauthorized
    if (error.code !== 401) {
      Sentry.withScope(scope => {
        scope.setExtra('params', params)
        Sentry.captureException(error)
      })
    }
    return []
  }
}

function getPotentialCommits({ baseCommits, compareCommits }) {
  // We take all commits included in base commit history and in compare commit history
  const potentialCommits = baseCommits.filter(baseCommit =>
    compareCommits.some(compareCommit => baseCommit.sha === compareCommit.sha),
  )

  // If no commit is found, we will use all base commits
  // TODO: this case should not happen, we should always find a base commit to our branch
  if (!potentialCommits.length) {
    return baseCommits
  }

  return potentialCommits
}

async function baseCompare({
  baseCommit,
  compareCommit,
  build,
  perPage = 100,
}) {
  build = await build.$query().eager('[repository, compareScreenshotBucket]')
  const user = await build.repository
    .getUsers()
    .limit(1)
    .first()

  // We can't use Github information without a user.
  if (!user) {
    return getLatestMasterBucket(build)
  }

  // Initialize GitHub API
  const owner = await build.repository.getOwner()
  const github = new GitHubAPI({ debug: config.get('env') === 'development' })
  github.authenticate({
    type: 'oauth',
    token: user.accessToken,
  })

  const baseCommits = await getCommits({
    github,
    owner: owner.login,
    repo: build.repository.name,
    sha: baseCommit,
    perPage,
  })

  const compareCommits = await getCommits({
    github,
    owner: owner.login,
    repo: build.repository.name,
    sha: compareCommit,
    perPage,
  })

  const potentialCommits = getPotentialCommits({
    baseCommits,
    compareCommits,
  })

  return getBaseScreenshotBucket({
    commits: potentialCommits,
    build,
  })
}

export default baseCompare
