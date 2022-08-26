import * as React from "react";
import { Container, LoadingAlert } from "@argos-ci/app/src/components";
import { isUserSyncing } from "../modules/user";
import { useUser, useRefetchUser } from "./User";

const REFETCH_DELAY = 1000;

export function SyncAlert() {
  const user = useUser();
  const refetchUser = useRefetchUser();
  const syncing = isUserSyncing(user);

  React.useEffect(() => {
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
    <Container>
      <LoadingAlert severity="neutral" mt={3}>
        Argos fetch your repositories from GitHub. It should not take long.
      </LoadingAlert>
    </Container>
  );
}
