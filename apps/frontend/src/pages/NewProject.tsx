import { Navigate } from "react-router-dom";

import { getLatestVisitedAccount } from "@/containers/AccountHistory";
import { AuthGuard } from "@/containers/AuthGuard";

import { getAccountURL } from "./Account/AccountParams";

export function Component() {
  return (
    <AuthGuard>
      {({ authPayload }) => {
        const accountSlug =
          getLatestVisitedAccount() ?? authPayload.account.slug;
        return (
          <Navigate replace to={`${getAccountURL({ accountSlug })}/new`} />
        );
      }}
    </AuthGuard>
  );
}
