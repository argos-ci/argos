import { useMemo } from "react";
import { useParams } from "react-router-dom";

export interface AccountParams {
  accountSlug: string;
}

/**
 * Returns parameters for an account page.
 */
export function useAccountParams(): AccountParams | null {
  const { accountSlug } = useParams();
  const params = useMemo(() => {
    if (!accountSlug) {
      return null;
    }
    return { accountSlug };
  }, [accountSlug]);
  return params;
}

export function getAccountURL(params: AccountParams): string {
  return `/${params.accountSlug}`;
}
