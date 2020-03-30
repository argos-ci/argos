import { getInstallationOctokit } from '@argos-ci/github'
import {
  Build,
  BuildNotification,
  UserRepositoryRight,
} from '@argos-ci/database/models'
import { job as buildNotificationJob } from './job'

const NOTIFICATIONS = {
  progress: {
    status: 'in_progress',
    output: {
      title: 'Diff in progress',
      summary: 'Argos is comparing your snapshots, please be patient.',
    },
  },
  'no-diff-detected': {
    status: 'completed',
    conclusion: 'success',
    output: {
      title: 'No difference detected',
      summary: "Go back to work, everything's good!",
    },
  },
  'diff-detected': {
    status: 'completed',
    conclusion: 'action_required',
    output: {
      title: 'Difference detected',
      summary: 'A difference has been detected, you have to take a decision.',
    },
    actions: [],
  },
  'diff-accepted': {
    status: 'completed',
    conclusion: 'success',
    output: {
      title: 'Differences accepted',
      summary: "Differences have been accepted. Everything's fine.",
    },
  },
  'diff-rejected': {
    status: 'completed',
    conclusion: 'failure',
    output: {
      title: 'Differences rejected',
      summary:
        'Differences have been rejected. There is something to fix here.',
    },
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

async function getBuildOctokit(build) {
  if (build.octokit) return build.octokit
  const [installation] = build.repository.installations
  if (!installation) {
    throw new Error(
      `Installation not found for repository "${build.repository.id}"`,
    )
  }
  const octokit = await getInstallationOctokit(installation.githubId)
  build.octokit = octokit
  return octokit
}

async function createOrUpdateCheck(octokit, data) {
  const {
    data: {
      check_runs: [check],
    },
  } = await octokit.checks.listForRef({
    owner: data.owner,
    repo: data.repo,
    ref: data.head_sha,
    check_name: data.name,
  })

  if (check) {
    return octokit.checks.update({
      ...data,
      check_run_id: check.id,
    })
  }
  return octokit.checks.create(data)
}

export async function processBuildNotification(buildNotification) {
  const build = await Build.query()
    .withGraphFetched('[repository.installations, compareScreenshotBucket]')
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
    throw new Error(
      `Cannot find notification for type: "${buildNotification.type}"`,
    )
  }

  const owner = await build.repository.$relatedOwner()

  if (!owner) {
    throw new Error('Owner not found')
  }

  const user = await build.repository
    .getUsers()
    .orderBy('id', 'asc')
    .limit(1)
    .first()

  if (!user) {
    throw new Error('User not found')
  }

  const octokit = await getBuildOctokit(build)

  const buildUrl = await build.getUrl()

  try {
    return await createOrUpdateCheck(octokit, {
      owner: owner.login,
      repo: build.repository.name,
      name: 'argos',
      head_sha: build.compareScreenshotBucket.commit,
      external_id: build.id,
      details_url: buildUrl,
      ...notification,
    })
  } catch (error) {
    // Several things here:
    // - Token is no longer valid
    // - The user lost access to the repository
    // - The repository has been removed
    if (error.status === 401 || error.status === 404) {
      // We remove the rights for the user
      await UserRepositoryRight.query()
        .where({ userId: user.id, repositoryId: build.repository.id })
        .delete()
      // We push a new notification
      await pushBuildNotification({
        type: buildNotification.type,
        buildId: build.id,
      })
      // The error should not be notified on Sentry
      error.ignoreCapture = true
    }
    throw error
  }
}
