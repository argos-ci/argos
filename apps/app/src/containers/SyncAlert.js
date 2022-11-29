import { useEffect } from "react";

import { isUserSyncing } from "@/modules/user";

import { useRefetchUser, useUser } from "./User";
import { Banner } from "@/modern/ui/Banner";
import { Loader } from "@/modern/ui/Loader";

const REFETCH_DELAY = 1000;

export function SyncAlert() {
  const user = useUser();
  const refetchUser = useRefetchUser();
  const syncing = isUserSyncing(user);

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
    <Banner className="text-center">
      <Loader size={16} className="mr-2 inline" />
      Argos is fetching your repositories from GitHub. It should not take long.
    </Banner>
  );
}
