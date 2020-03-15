export function hasWritePermission(ownerOrRepo) {
  return ownerOrRepo.permissions.includes('write')
}
