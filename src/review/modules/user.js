function hasSyncStatus(synchronization) {
  return Boolean(
    synchronization &&
      (synchronization.jobStatus === 'queued' ||
        synchronization.jobStatus === 'progress'),
  )
}

export function isUserSyncing(user) {
  if (!user) return false
  const userSyncing = hasSyncStatus(user.latestSynchronization)
  const installationSyncing = user.installations.some(installation =>
    hasSyncStatus(installation.latestSynchronization),
  )
  return userSyncing || installationSyncing
}
