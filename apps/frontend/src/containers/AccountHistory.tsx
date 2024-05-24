import * as React from "react";

import { getItem, setItem } from "@/util/storage";

import {
  decodeAuthToken,
  readAuthTokenCookie,
  useAuthTokenPayload,
} from "./Auth";

function getStorageKey(accountId: string) {
  return `${accountId}:lastVisitedAccount`;
}

export function useVisitAccount(accountSlug: string) {
  const payload = useAuthTokenPayload();
  React.useEffect(() => {
    if (payload) {
      setItem(getStorageKey(payload.account.id), accountSlug);
    }
  }, [accountSlug, payload]);
}

export function getLatestVisitedAccount() {
  const token = readAuthTokenCookie();
  if (!token) {
    return null;
  }
  const payload = decodeAuthToken(token);
  if (!payload) {
    return null;
  }
  return getItem(getStorageKey(payload.account.id));
}
