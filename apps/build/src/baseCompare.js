import { Octokit } from '@octokit/rest'
import config from '@argos-ci/config'
import {
  ScreenshotBucket,
  UserRepositoryRight,
} from '@argos-ci/database/models'

async function getLatestMasterBucket(build) {
  const bucket = await ScreenshotBucket.query()
    .where({
      branch: build.repository.baselineBranch,
      repositoryId: build.repository.id,
      complete: true,
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
      complete: true,
    })
    .whereIn('commit', shas)

  // Sort buckets from the most recent commit to the oldest one
  buckets.sort(
    (bucketA, bucketB) =>
      shas.indexOf(bucketA.commit) - shas.indexOf(bucketB.commit),
  )

  return buckets[0] || getLatestMasterBucket(build)
}

async function getCommits({ user, repository, octokit, owner, sha, perPage }) {
  const params = {
    owner,
    repo: repository.name,
    sha,
    per_page: perPage,
    page: 1,
  }

  try {
    const response = await octokit.repos.listCommits(params)
    return response.data
  } catch (error) {
    // Several things here:
    // - Token is no longer valid
    // - The user lost access to the repository
    // - The repository has been removed
    if (error.status === 401 || error.status === 404) {
      // We remove the rights for the user
      await UserRepositoryRight.query()
        .where({ userId: user.id, repositoryId: repository.id })
        .delete()
      // The error should not be notified on Sentry
      error.ignoreCapture = true
      return []
    }
    throw error
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

export async function baseCompare({
  baseCommit,
  compareCommit,
  build,
  perPage = 100,
}) {
  build = await build
    .$query()
    .withGraphFetched('[repository, compareScreenshotBucket]')
  const user = await build.repository
    .getUsers()
    .limit(1)
    .first()

  // We can't use Github information without a user.
  if (!user) {
    return getLatestMasterBucket(build)
  }

  // Initialize GitHub API
  const owner = await build.repository.$relatedOwner()
  const octokit = new Octokit({
    debug: config.get('env') === 'development',
    auth: user.accessToken,
  })

  const baseCommits = await getCommits({
    user,
    repository: build.repository,
    octokit,
    owner: owner.login,
    sha: baseCommit,
    perPage,
  })

  const compareCommits = await getCommits({
    user,
    repository: build.repository,
    octokit,
    owner: owner.login,
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
