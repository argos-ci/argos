import { Octokit } from '@octokit/rest'
import { createOAuthAppAuth, createAppAuth } from '@octokit/auth'
import config from '@argos-ci/config'

export function getAppOctokit() {
  return new Octokit({
    debug: config.get('env') === 'development',
    authStrategy: createAppAuth,
    auth: {
      id: config.get('github.appId'),
      privateKey: config.get('github.privateKey'),
    },
  })
}

export function getTokenOctokit(token) {
  return new Octokit({
    debug: config.get('env') === 'development',
    auth: token,
  })
}

export function getOAuthOctokit() {
  return new Octokit({
    authStrategy: createOAuthAppAuth,
    auth: {
      clientId: config.get('github.clientId'),
      clientSecret: config.get('github.clientSecret'),
    },
  })
}

/**
 * @param {number} installationId
 * @returns {Promise<Octokit | null>}
 */
export async function getInstallationOctokit(installationId) {
  const appOctokit = getAppOctokit()
  const token = await (async () => {
    try {
      const { token } = await appOctokit.auth({
        type: 'installation',
        installationId,
      })
      return token
    } catch (error) {
      if (error.status === 404) {
        return null
      }
      throw error
    }
  })()
  if (!token) return null
  return getTokenOctokit(token)
}
