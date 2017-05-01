import User from 'server/models/User'
import Organization from 'server/models/Organization'

export async function getOwner({ login }) {
  let [owner] = await Organization.query().where({ login })
  if (owner) {
    owner.type = 'organization'
    return owner
  }

  [owner] = await User.query().where({ login })
  if (owner) {
    owner.type = 'user'
    return owner
  }

  return null
}
