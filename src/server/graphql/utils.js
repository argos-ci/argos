import User from 'server/models/User'
import Organization from 'server/models/Organization'
import UserRepositoryRight from 'server/models/UserRepositoryRight'

export async function getOwner({ login }) {
  let [owner] = await Organization.query().where({ login })
  if (owner) {
    owner.type = 'organization'
    return owner
  }

  ([owner] = await User.query().where({ login }))
  if (!owner) {
    return null
  }
  owner.type = 'user'
  return owner
}

export async function isRepositoryAccessible(repository, context) {
  if (!repository) {
    return false
  }

  if (!repository.private) {
    return true
  }

  if (!context.user) {
    return false
  }

  const userRepositoryRights = await UserRepositoryRight.query().where({
    userId: context.user.id,
    repositoryId: repository.id,
  })

  return userRepositoryRights.length > 0
}
