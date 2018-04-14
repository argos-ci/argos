import GitHubAPI from 'github'
import config from 'config'
import Build from 'server/models/Build'
import BuildNotification from 'server/models/BuildNotification'
import { formatUrlFromBuild } from 'modules/urls/buildUrl'
import buildNotificationJob from 'server/jobs/buildNotification'

const NOTIFICATIONS = {
  progress: {
    state: 'pending',
    description: 'Build in progress...',
  },
  'no-diff-detected': {
    state: 'success',
    description: 'Everything good!',
  },
  'diff-detected': {
    state: 'failure',
    description: 'Difference detected.',
  },
  'diff-accepted': {
    state: 'success',
    description: 'Difference accepted.',
  },
  'diff-rejected': {
    state: 'failure',
    description: 'Difference rejected.',
  },
}

async function pushBuildNotification({ type, buildId }) {
  const buildNotification = await BuildNotification.query().insert({
    buildId,
    type,
    jobStatus: 'pending',
  })
  buildNotificationJob.push(buildNotification.id)
  return buildNotification
}

export { pushBuildNotification }

export async function processBuildNotification(buildNotification) {
  const build = await Build.query()
    .eager('[repository.[organization, user], compareScreenshotBucket]')
    .findById(buildNotification.buildId)

  if (!build) {
    throw new Error('Build not found')
  }

  // Skip sample build
  if (build.number === 0) {
    return null
  }

  const notification = NOTIFICATIONS[buildNotification.type]

  if (!notification) {
    throw new Error(`Cannot find notification for type: "${buildNotification.type}"`)
  }

  const owner = build.repository.user || build.repository.organization

  if (!owner) {
    throw new Error('Owner not found')
  }

  const user = await build.repository
    .getUsers()
    .limit(1)
    .first()

  if (!user) {
    throw new Error('User not found')
  }

  const github = new GitHubAPI({ debug: config.get('env') === 'development' })

  github.authenticate({
    type: 'oauth',
    token: user.accessToken,
  })

  const buildUrl = await formatUrlFromBuild(build)

  // https://developer.github.com/v3/repos/statuses/
  return github.repos.createStatus({
    owner: owner.login,
    repo: build.repository.name,
    sha: build.compareScreenshotBucket.commit,
    state: notification.state,
    description: notification.description, // Short description of the status.
    target_url: buildUrl,
    context: 'argos',
  })
}
