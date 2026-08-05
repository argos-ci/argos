import { useEffect } from "react";

import * as storage from "@/util/storage";

import { useAuth } from "./Auth";

function getStorageKey(accountId: string) {
  return `${accountId}:lastVisitedAccount`;
}

export function useVisitAccount(accountSlug: string | null) {
  const auth = useAuth();
  const account = auth.status === "authenticated" ? auth.account : null;
  useEffect(() => {
    // Runs again once the account lands, so nothing is missed by starting null.
    if (accountSlug && account) {
      storage.setItem(getStorageKey(account.id), accountSlug);
    }
  }, [accountSlug, account]);
}

export function getLatestVisitedAccount(accountId: string) {
  return storage.getItem(getStorageKey(accountId));
}
