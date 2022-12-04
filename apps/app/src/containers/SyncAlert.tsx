import { useEffect } from "react";

import { graphql } from "@/gql";
import { Banner } from "@/ui/Banner";
import { Loader } from "@/ui/Loader";

import { useQuery } from "./Apollo";
import { useAuthTokenPayload, useLogout } from "./Auth";

const REFETCH_DELAY = 1000;

const UserQuery = graphql(`
  query SyncAlert_user {
    user {
      id
      login
      latestSynchronization {
        id
        jobStatus
      }
    }
  }
`);

export function SyncAlert() {
  const payload = useAuthTokenPayload();
  const { data, refetch } = useQuery(UserQuery, {
    skip: !payload,
  });
  const logout = useLogout();

  // Check everything is synced between token and user
  useEffect(() => {
    if (!payload) return;
    if (!data) return;

    if (
      !data.user ||
      data.user.id !== payload.id ||
      data.user.login !== payload.login
    ) {
      logout();
    }
  }, [payload, data, logout]);

  const jobStatus = data?.user?.latestSynchronization?.jobStatus;

  const syncing = jobStatus === "pending" || jobStatus === "progress";

  useEffect(() => {
    if (syncing) {
      const id = setInterval(() => refetch(), REFETCH_DELAY);
      return () => {
        clearInterval(id);
      };
    }
    return undefined;
  }, [syncing, refetch]);

  if (!data) return null;
  if (!data.user) return null;
  if (!syncing) return null;

  return (
    <Banner color="neutral" className="text-center">
      <Loader size={16} className="mr-2 inline" />
      Argos is fetching your repositories from GitHub. It should not take long.
    </Banner>
  );
}
