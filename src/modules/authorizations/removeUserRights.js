import UserRepositoryRight from 'server/models/UserRepositoryRight'

export default async function removeUserRights({ userId, repositoryId }) {
  // We remove the right for the user
  await UserRepositoryRight.query()
    .where({ userId, repositoryId })
    .delete()
}
