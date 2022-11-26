import { useEffect } from "react";

import { Banner } from "@/ui/Banner";
import { Loader } from "@/ui/Loader";

import { checkIsUserSyncing, useRefetchUser, useUser } from "./User";

const REFETCH_DELAY = 1000;

export function SyncAlert() {
  const user = useUser();
  const refetchUser = useRefetchUser();
  const syncing = checkIsUserSyncing(user);

  useEffect(() => {
    if (syncing) {
      const id = setInterval(() => refetchUser(), REFETCH_DELAY);
      return () => {
        clearInterval(id);
      };
    }
    return undefined;
  }, [syncing, refetchUser]);

  if (!user || !syncing) return null;

  return (
    <Banner color="neutral" className="text-center">
      <Loader size={16} className="mr-2 inline" />
      Argos is fetching your repositories from GitHub. It should not take long.
    </Banner>
  );
}
