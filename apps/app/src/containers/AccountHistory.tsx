import * as React from "react";
import { useAuthTokenPayload } from "./Auth";

const STORAGE_KEY = "visitedAccount";

export const useVisitAccount = (accountSlug: string | null) => {
  const payload = useAuthTokenPayload();
  React.useEffect(() => {
    if (accountSlug) {
      window.localStorage.setItem(STORAGE_KEY, accountSlug);
    }
  }, [accountSlug, payload]);
};

export const getLatestVisitedAccount = () => {
  return window.localStorage.getItem(STORAGE_KEY);
};
