import { useEffect } from "react";

import config from "@/config";
import { JWTData, useAuthTokenPayload } from "@/containers/Auth";

const RedirectToWebsite = () => {
  useEffect(() => {
    window.location.replace(new URL("/login", config.get("server.url")).href);
  }, []);
  return null;
};

export type AuthGuardProps = {
  children: ({ authPayload }: { authPayload: JWTData }) => React.ReactNode;
};

export const AuthGuard = (props: AuthGuardProps) => {
  const authPayload = useAuthTokenPayload();
  if (authPayload) {
    return props.children({ authPayload }) as React.ReactElement;
  }

  return <RedirectToWebsite />;
};
