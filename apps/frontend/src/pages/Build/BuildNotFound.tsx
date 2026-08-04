import { Navigate, useLocation } from "react-router";

import { useAuthStatus } from "@/containers/Auth";
import { PageLoader } from "@/ui/PageLoader";

export const BuildNotFound = () => {
  const status = useAuthStatus();
  const { pathname } = useLocation();

  // The two branches send the viewer to different places, so wait for `me`.
  // `PageLoader` stays invisible for its first 400ms, so this does not flash.
  if (status === "loading") {
    return <PageLoader />;
  }

  if (status === "authenticated") {
    // @TODO implement a 404 page
    return <Navigate to="/" />;
  }

  return <Navigate to={`/login?r=${pathname}`} />;
};
