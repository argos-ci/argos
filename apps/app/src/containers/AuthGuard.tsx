import { useEffect } from "react";

import { JWTData, useAuthTokenPayload } from "@/containers/Auth";

const RedirectToWebsite = () => {
  useEffect(() => {
    window.location.replace("https://argos-ci.com");
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
  if (process.env["NODE_ENV"] !== "production") {
    return (
      <div className="container mx-auto p-4 text-center">
        Not logged in, in production you would be redirected to
        https://argos-ci.com.
      </div>
    );
  }

  return <RedirectToWebsite />;
};
