export function isUserSyncing(user: {
  latestSynchronization?: { jobStatus: string } | null | undefined;
}) {
  return (
    user?.latestSynchronization?.jobStatus === "queued" ||
    user?.latestSynchronization?.jobStatus === "progress"
  );
}
