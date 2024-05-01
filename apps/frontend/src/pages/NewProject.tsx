import { Navigate } from "react-router-dom";

import { getLatestVisitedAccount } from "@/containers/AccountHistory";
import { AuthGuard } from "@/containers/AuthGuard";

/** @route */
export function Component() {
  return (
    <AuthGuard>
      {({ authPayload }) => {
        const accountSlug =
          getLatestVisitedAccount() ?? authPayload.account.slug;
        return <Navigate replace to={`/${accountSlug}/new`} />;
      }}
    </AuthGuard>
  );
}
