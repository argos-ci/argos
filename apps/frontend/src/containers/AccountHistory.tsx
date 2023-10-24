import * as React from "react";
import {
  decodeAuthToken,
  readAuthTokenCookie,
  useAuthTokenPayload,
} from "./Auth";
import { getItem, setItem } from "@/util/storage";

const getStorageKey = (accountId: string) => {
  return `${accountId}:lastVisitedAccount`;
};

export const useVisitAccount = (accountSlug: string | null) => {
  const payload = useAuthTokenPayload();
  React.useEffect(() => {
    if (accountSlug && payload) {
      setItem(getStorageKey(payload.account.id), accountSlug);
    }
  }, [accountSlug, payload]);
};

export const getLatestVisitedAccount = () => {
  const token = readAuthTokenCookie();
  if (!token) return null;
  const payload = decodeAuthToken(token);
  if (!payload) return null;
  return getItem(getStorageKey(payload.account.id));
};
