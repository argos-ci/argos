import UserRepositoryRight from 'server/models/UserRepositoryRight'
import syncFromUserId from 'modules/synchronizer/syncFromUserId'

export default async function removeUserRights({ userId, repositoryId }) {
  // We remove the right for the user
  await UserRepositoryRight.query()
    .where({ userId, repositoryId })
    .delete()
  // We push a synchronization job to fix auth
  await syncFromUserId(userId)
}
