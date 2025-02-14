import { useEffect } from "react";

import * as storage from "@/util/storage";

import {
  decodeAuthToken,
  readAuthTokenCookie,
  useAuthTokenPayload,
} from "./Auth";

function getStorageKey(accountId: string) {
  return `${accountId}:lastVisitedAccount`;
}

export function useVisitAccount(accountSlug: string | null) {
  const payload = useAuthTokenPayload();
  useEffect(() => {
    if (accountSlug && payload) {
      storage.setItem(getStorageKey(payload.account.id), accountSlug);
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
  return storage.getItem(getStorageKey(payload.account.id));
}
