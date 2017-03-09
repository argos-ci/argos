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
  'diff-rejection': {
    state: 'success',
    description: 'Difference rejected.',
  },
}

export async function pushBuildNotification({ type, buildId }) {
  const buildNotification = await BuildNotification.query().insert({
    buildId,
    type,
    jobStatus: 'pending',
  })
  buildNotificationJob.push(buildNotification.id)
  return buildNotification
}

export async function processBuildNotification(buildNotification) {
  const build = await Build.query().findById(buildNotification.buildId)
    .eager('[repository, repository.user, repository.organization, compareScreenshotBucket]')

  if (!build) {
    throw new Error('Build not found')
  }

  const notification = NOTIFICATIONS[buildNotification.type]

  if (!notification) {
    throw new Error(`Cannot find notification for type: "${buildNotification.type}"`)
  }

  const [user] = await build.getUsers()

  if (!user) {
    throw new Error('No user found')
  }

  const owner = build.repository.user || build.repository.organization

  if (!owner) {
    throw new Error('Owner not found')
  }

  const github = new GitHubAPI({
    debug: config.get('env') === 'development',
  })

  github.authenticate({
    type: 'oauth',
    token: user.accessToken,
  })

  const buildUrl = await formatUrlFromBuild(build, { absolute: true })

  // https://developer.github.com/v3/repos/statuses/
  return github.repos.createStatus({
    owner: owner.name,
    repo: build.repository.name,
    sha: build.compareScreenshotBucket.commit,
    state: notification.state,
    description: notification.description, // Short description of the status.
    target_url: buildUrl,
    context: 'argos',
  })
}
