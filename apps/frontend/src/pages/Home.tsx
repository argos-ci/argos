import { Navigate } from "react-router-dom";

import { getLatestVisitedAccount } from "@/containers/AccountHistory";
import { AuthGuard } from "@/containers/AuthGuard";

export const Home = () => {
  return (
    <AuthGuard>
      {({ authPayload }) => {
        const accountSlug =
          getLatestVisitedAccount() ?? authPayload.account.slug;
        return <Navigate replace to={`/${accountSlug}`} />;
      }}
    </AuthGuard>
  );
};
