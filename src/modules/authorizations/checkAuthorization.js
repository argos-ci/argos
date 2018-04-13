import config from 'config'
import { INVALID_TOKEN } from 'modules/authorizations/authorizationStatuses'
import getAuthorizationStatus from 'modules/authorizations/getAuthorizationStatus'
import githubClient from 'modules/authorizations/githubClient'

async function checkAuthorization({ accessToken, privateSync }) {
  let authorization

  try {
    authorization = await githubClient.authorization.check({
      access_token: accessToken,
      client_id: config.get('github.clientId'),
    })
  } catch (error) {
    if (error.code === 404) {
      return { status: INVALID_TOKEN }
    }

    throw error
  }

  const {
    data: { scopes },
  } = authorization
  const status = getAuthorizationStatus({ privateSync, githubScopes: scopes })
  return { scopes, status }
}

export default checkAuthorization
