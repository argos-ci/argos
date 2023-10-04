import * as React from "react";
import {
  decodeAuthToken,
  readAuthTokenCookie,
  useAuthTokenPayload,
} from "./Auth";

const getStorageKey = (accountId: string) => {
  return `${accountId}:lastVisitedAccount`;
};

export const useVisitAccount = (accountSlug: string | null) => {
  const payload = useAuthTokenPayload();
  React.useEffect(() => {
    if (accountSlug && payload) {
      window.localStorage.setItem(
        getStorageKey(payload.account.id),
        accountSlug,
      );
    }
  }, [accountSlug, payload]);
};

export const getLatestVisitedAccount = () => {
  const token = readAuthTokenCookie();
  if (!token) return null;
  const payload = decodeAuthToken(token);
  if (!payload) return null;
  return window.localStorage.getItem(getStorageKey(payload.account.id));
};
