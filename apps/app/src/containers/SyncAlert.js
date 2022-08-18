import React from "react";
import { x } from "@xstyled/styled-components";
import { Alert, Loader, Link, Container } from "@argos-ci/app/src/components";
import { isUserSyncing } from "../modules/user";
import { useUser, useRefetchUser } from "./User";

const REFETCH_DELAY = 1000;

export function SyncAlert() {
  const user = useUser();
  const refetchUser = useRefetchUser();
  const [complete, setComplete] = React.useState(false);
  const syncing = isUserSyncing(user);

  React.useEffect(() => {
    if (syncing) {
      const id = setInterval(() => refetchUser(), REFETCH_DELAY);
      return () => {
        setComplete(true);
        clearInterval(id);
      };
    }
    return undefined;
  }, [syncing, refetchUser]);

  if (complete) {
    return (
      <Container>
        <Alert role="alert">
          The synchronization is complete.{" "}
          <Link onClick={() => window.location.reload()}>Reload</Link> the page
          to refresh the repository list.
        </Alert>
      </Container>
    );
  }

  if (!user || !syncing) return null;

  return (
    <Container>
      <Alert role="alert">
        <x.div
          display="flex"
          justifyContent="space-between"
          gap={2}
          alignItems="center"
        >
          Argos fetch your repositories from GitHub. It should not take long.
          <Loader />
        </x.div>
      </Alert>
    </Container>
  );
}
