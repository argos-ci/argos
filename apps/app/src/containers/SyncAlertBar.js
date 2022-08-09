import React from "react";
import { Button, Box } from "@smooth-ui/core-sc";
import { AlertBar, AlertBarBody, Loader } from "../components";
import { isUserSyncing } from "../modules/user";
import { useUser, useRefetchUser } from "./User";

const REFETCH_DELAY = 1000;

export function SyncAlertBar() {
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
      <AlertBar role="alert">
        <AlertBarBody>
          <Box row alignItems="center">
            <Box as="p" col={{ xs: 1, md: true }}>
              Synchronization is complete.
            </Box>
            <Box col={{ xs: 1, md: "auto" }}>
              <Button onClick={() => window.location.reload()}>
                Reload the page
              </Button>
            </Box>
          </Box>
        </AlertBarBody>
      </AlertBar>
    );
  }
  if (!user || !syncing) return null;
  return (
    <AlertBar role="alert">
      <AlertBarBody>
        <Box row alignItems="center">
          <Box as="p" col={{ xs: 1, md: true }}>
            Your repositories are syncing, it should not be long.
          </Box>
          <Box col={{ xs: 1, md: "auto" }}>
            <Loader />
          </Box>
        </Box>
      </AlertBarBody>
    </AlertBar>
  );
}
