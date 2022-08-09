function hasSyncStatus(synchronization) {
  return Boolean(
    synchronization &&
      (synchronization.jobStatus === "queued" ||
        synchronization.jobStatus === "progress")
  );
}

export function isUserSyncing(user) {
  if (!user) return false;
  const userSyncing = hasSyncStatus(user.latestSynchronization);
  return userSyncing;
}
