import { useEffect } from "react";

import * as storage from "@/util/storage";

import { useAuthTokenPayload } from "./Auth";

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

export function getLatestVisitedAccount(accountId: string) {
  return storage.getItem(getStorageKey(accountId));
}
