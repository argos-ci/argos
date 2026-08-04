import { Navigate, useLocation } from "react-router";

import { useAuth } from "@/containers/Auth";

export const BuildNotFound = () => {
  const auth = useAuth();
  const { pathname } = useLocation();

  if (auth.status === "authenticated") {
    // @TODO implement a 404 page
    return <Navigate to="/" />;
  }

  return <Navigate to={`/login?r=${pathname}`} />;
};
