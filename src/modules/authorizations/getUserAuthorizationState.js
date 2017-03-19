import checkAuthorization, {
  INVALID_TOKEN,
  SCOPE_MISSING,
  VALID_AUTHORIZATION,
} from 'modules/authorizations/checkAuthorization'

async function getUserAuthorizationState({
  accessToken,
  privateSync,
  previousAccessToken,
}) {
  const authorization = await checkAuthorization({
    privateSync,
    accessToken,
  })
  switch (authorization.result) {
    case INVALID_TOKEN:
      throw new Error('Access token is invalid')
    case VALID_AUTHORIZATION:
      return {
        accessToken,
        githubScopes: authorization.scopes,
      }
    case SCOPE_MISSING: {
      if (!previousAccessToken) {
        return {
          accessToken,
          githubScopes: authorization.scopes,
        }
      }

      const previousAuthorization = await checkAuthorization({
        privateSync,
        accessToken: previousAccessToken,
      })
      switch (previousAuthorization.result) {
        case VALID_AUTHORIZATION:
          return {
            githubScopes: previousAuthorization.scopes,
          }
        case SCOPE_MISSING:
        case INVALID_TOKEN:
          return {
            accessToken,
            githubScopes: authorization.scopes,
          }
        default:
          throw new Error('Invalid authorization')
      }
    }
    default:
      throw new Error('Invalid authorization')
  }
}

export default getUserAuthorizationState
