import { useEffect } from "react";

import { config } from "@/config";
import { JWTData, useAuthTokenPayload } from "@/containers/Auth";

const RedirectToWebsite = () => {
  useEffect(() => {
    window.location.replace(new URL("/login", config.server.url).href);
  }, []);
  return null;
};

export function AuthGuard(props: {
  children: ({ authPayload }: { authPayload: JWTData }) => React.ReactNode;
}) {
  const authPayload = useAuthTokenPayload();
  if (authPayload) {
    return props.children({ authPayload }) as React.ReactElement;
  }

  return <RedirectToWebsite />;
}
