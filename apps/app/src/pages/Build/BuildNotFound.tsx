import { useIsLoggedIn } from "@/containers/Auth";
import { Navigate, useLocation } from "react-router-dom";

export const BuildNotFound = () => {
  const loggedIn = useIsLoggedIn();
  const { pathname } = useLocation();

  if (loggedIn) {
    // @TODO implement a 404 page
    return <Navigate to="/" />;
  }

  return <Navigate to={`/login?r=${pathname}`} />;
};
