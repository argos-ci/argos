import * as React from "react";

const STORAGE_KEY = "visitedAccount";

export const useVisitAccount = (accountSlug: string | null) => {
  React.useEffect(() => {
    if (accountSlug) {
      window.localStorage.setItem(STORAGE_KEY, accountSlug);
    }
  }, [accountSlug]);
};

export const getLatestVisitedAccount = () => {
  return window.localStorage.getItem(STORAGE_KEY);
};
