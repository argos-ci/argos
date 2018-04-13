import { SCOPES } from 'server/constants'
import APIError from 'server/graphql/APIError'
import User from 'server/models/User'

export default async function resolveUsurpUser(source, { input }, context) {
  if (!context.user) {
    throw new APIError('Invalid user identification')
  }

  if (context.user.scopes.indexOf(SCOPES.SUPER_ADMIN) === -1) {
    throw new APIError('Invalid user authorization')
  }

  const user = await User.query()
    .where({ email: input.email })
    .limit(1)
    .first()

  if (!user) {
    throw new APIError('Wrong email')
  }

  await new Promise((accept, reject) => {
    context.login(user, err => {
      if (err) {
        reject(err)
        return
      }

      accept()
    })
  })

  return user
}
