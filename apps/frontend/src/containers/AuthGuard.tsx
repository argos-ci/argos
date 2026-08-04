import { useEffect } from "react";

import { config } from "@/config";
import { JWTData, useAuthStatus, useAuthTokenPayload } from "@/containers/Auth";
import { PageLoader } from "@/ui/PageLoader";

export function RedirectToWebsite() {
  useEffect(() => {
    window.location.replace(new URL("/login", config.server.url).href);
  }, []);
  return null;
}

export function AuthGuard(props: {
  children: ({ authPayload }: { authPayload: JWTData }) => React.ReactNode;
}) {
  const status = useAuthStatus();
  const authPayload = useAuthTokenPayload();

  // The app renders before `me` resolves, so an absent account only means
  // "logged out" once the query has answered. Redirecting on the first render
  // would bounce a logged-in user straight to /login.
  if (status === "loading") {
    return <PageLoader />;
  }

  if (authPayload) {
    return props.children({ authPayload }) as React.ReactElement;
  }

  return <RedirectToWebsite />;
}
