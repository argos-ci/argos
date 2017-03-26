import GitHubAPI from 'github'
import config from 'config'
import ScreenshotBucket from 'server/models/ScreenshotBucket'

async function fallbackToMaster(repository) {
  const bucket = await ScreenshotBucket.query()
    .where({
      branch: 'master',
      repositoryId: repository.id,
    })
    .orderBy('id', 'desc')
    .limit(1)
    .first()

  return bucket || null
}

export default async function baseCompare({
  baseCommit,
  compareCommit,
  repository,
  perPage = 30,
}) {
  const user = await repository.getUsers().limit(1).first()

  if (!user) {
    return {
      user: null,
      compareCommitFound: false,
      baseScreenshotBucket: null,
    }
  }

  const owner = await repository.getOwner()
  const github = new GitHubAPI({ debug: config.get('env') === 'development' })
  github.authenticate({
    type: 'oauth',
    token: user.accessToken,
  })

  // http://stackoverflow.com/questions/9179828/github-api-retrieve-all-commits-for-all-branches-for-a-repo
  // http://mikedeboer.github.io/node-github/#api-repos-getBranch
  const baseCommits = await github.repos.getCommits({
    owner: owner.login,
    repo: repository.name,
    sha: baseCommit,
    per_page: perPage,
    page: 1,
  })

  let compareCommits

  try {
    compareCommits = await github.repos.getCommits({
      owner: owner.login,
      repo: repository.name,
      sha: compareCommit,
      per_page: perPage,
      page: 1,
    })
  } catch (error) {
    if (error.status === 'Not Found') {
      return {
        user,
        compareCommitFound: false,
        baseScreenshotBucket: null,
      }
    }

    throw error
  }

  const potentialCommits = []
  const forkCommit = baseCommits.data.find((baseCommit) => {
    potentialCommits.push(baseCommit)

    return compareCommits.data.some(compareCommit => (
      baseCommit.sha === compareCommit.sha
    ))
  })

  let baseScreenshotBucket

  if (!forkCommit) {
    baseScreenshotBucket = await fallbackToMaster(repository)
  }

  if (!baseScreenshotBucket) {
    const buckets = await ScreenshotBucket.query()
      .where({
        repositoryId: repository.id,
      })
      .whereIn('commit', potentialCommits.map(commit => commit.sha))

    // Reverse the potentialCommits order.
    buckets.sort((bucketA, bucketB) => {
      return potentialCommits.indexOf(bucketA.commit) - potentialCommits.indexOf(bucketB.commit)
    })

    baseScreenshotBucket = buckets[0] || null
  }

  return {
    user,
    compareCommitFound: true,
    baseScreenshotBucket,
  }
}
