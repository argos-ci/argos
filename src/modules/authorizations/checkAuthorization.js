import GitHubAPI from 'github'
import config from 'config'
import getAuthorizationStatus, { CONSISTENT } from './getAuthorizationStatus'

const github = new GitHubAPI()
github.authenticate({
  type: 'basic',
  username: config.get('github.clientId'),
  password: config.get('github.clientSecret'),
})

export const VALID_AUTHORIZATION = 'VALID_AUTHORIZATION'
export const INVALID_TOKEN = 'INVALID_TOKEN'
export const SCOPE_MISSING = 'SCOPE_MISSING'

async function checkAuthorization({ accessToken, privateSync }) {
  let authorization

  try {
    authorization = await github.authorization.check({
      access_token: accessToken,
      client_id: config.get('github.clientId'),
    })
  } catch (error) {
    if (error.code === 404) {
      return { result: INVALID_TOKEN }
    }

    throw error
  }

  const { scopes } = authorization.data
  const status = getAuthorizationStatus({ privateSync, githubScopes: scopes })
  return status === CONSISTENT ? {
    result: VALID_AUTHORIZATION,
    scopes,
  } : {
    result: SCOPE_MISSING,
    scopes,
  }
}

export default checkAuthorization
