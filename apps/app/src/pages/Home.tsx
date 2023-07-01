import { Navigate } from "react-router-dom";

import { AuthGuard } from "@/containers/AuthGuard";

export const Home = () => {
  return (
    <AuthGuard>
      {({ authPayload }) => {
        return <Navigate replace to={`/${authPayload.account.slug}`} />;
      }}
    </AuthGuard>
  );
};
