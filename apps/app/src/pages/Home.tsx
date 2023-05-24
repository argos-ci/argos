// import { useEffect } from "react";
import { useEffect } from "react";
import { Navigate } from "react-router-dom";

import { useAuthTokenPayload } from "@/containers/Auth";

const RedirectToWww = () => {
  useEffect(() => {
    window.location.replace("https://argos-ci.com");
  }, []);
  return null;
};

export const Home = () => {
  const authPayload = useAuthTokenPayload();
  if (authPayload) {
    return <Navigate replace to={`/${authPayload.account.slug}`} />;
  }
  if (process.env["NODE_ENV"] !== "production") {
    return (
      <div className="container mx-auto p-4 text-center">
        Not logged in, in production you would be redirected to
        https://argos-ci.com.
      </div>
    );
  }
  return <RedirectToWww />;
};
