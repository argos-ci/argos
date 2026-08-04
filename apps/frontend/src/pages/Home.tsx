import { Navigate } from "react-router";

import { getLatestVisitedAccount } from "@/containers/AccountHistory";
import { useAssertAuthAccount } from "@/containers/Auth";
import { AuthGuard } from "@/containers/AuthGuard";

import { getAccountURL } from "./Account/AccountParams";

/**
 * Sends the viewer to the account they last looked at, falling back to their
 * personal one. Suspends until `me` lands, since there is nothing to show here
 * without knowing which account to go to.
 */
function RedirectToLastAccount() {
  const account = useAssertAuthAccount();
  const accountSlug = getLatestVisitedAccount(account.id) ?? account.slug;
  return <Navigate replace to={getAccountURL({ accountSlug })} />;
}

export function Component() {
  return <AuthGuard>{() => <RedirectToLastAccount />}</AuthGuard>;
}
