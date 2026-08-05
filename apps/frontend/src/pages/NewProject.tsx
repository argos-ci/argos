import { Navigate } from "react-router";

import { getLatestVisitedAccount } from "@/containers/AccountHistory";
import { useAssertAuthAccount } from "@/containers/Auth";
import { AuthGuard } from "@/containers/AuthGuard";

import { getAccountURL } from "./Account/AccountParams";

/**
 * Sends the viewer to the new-project form of the account they last looked at,
 * falling back to their personal one.
 */
function RedirectToLastAccountNewProject() {
  const account = useAssertAuthAccount();
  const accountSlug = getLatestVisitedAccount(account.id) ?? account.slug;
  return <Navigate replace to={`${getAccountURL({ accountSlug })}/new`} />;
}

export function Component() {
  return <AuthGuard>{() => <RedirectToLastAccountNewProject />}</AuthGuard>;
}
