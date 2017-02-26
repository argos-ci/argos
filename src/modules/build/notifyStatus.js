import GitHubAPI from 'github'
import config from 'config'
import Build from 'server/models/Build'
import crashReporter from 'modules/crashReporter/crashReporter'
import { formatUrlFromBuild } from 'modules/urls/buildUrl'

export class NotifyError extends Error {}

const notifyStatus = async (buildId, { state, description }) => {
  const build = await Build.query().findById(buildId)
    .eager('[repository, repository.user, repository.organization, compareScreenshotBucket]')

  if (!build) {
    throw new NotifyError('Build not found')
  }

  const [user] = await build.getUsers()

  if (!user) {
    throw new NotifyError('No user found')
  }

  const owner = build.repository.user || build.repository.organization

  if (!owner) {
    throw new NotifyError('Owner not found')
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
    state,
    description, // Short description of the status.
    target_url: buildUrl,
    context: 'argos',
  })
}

const softNotifyStatus = async (buildId, status) => {
  try {
    return notifyStatus(buildId, status)
  } catch (error) {
    crashReporter.captureException(error)
    return null
  }
}

export const notifyProgress = buildId => softNotifyStatus(buildId, {
  state: 'pending',
  description: 'Argos build in progress',
})

export const notifySuccess = buildId => softNotifyStatus(buildId, {
  state: 'success',
  description: 'Argos build success',
})

export const notifyFailure = buildId => softNotifyStatus(buildId, {
  state: 'failure',
  description: 'Argos build failure',
})

export default notifyStatus
