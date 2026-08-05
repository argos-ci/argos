import { Suspense, useEffect } from "react";

import { config } from "@/config";
import { useAuth } from "@/containers/Auth";
import { PageLoader } from "@/ui/PageLoader";

export function RedirectToWebsite() {
  useEffect(() => {
    window.location.replace(new URL("/login", config.server.url).href);
  }, []);
  return null;
}

/**
 * Renders its children only for a signed-in viewer, sending anyone else to the
 * login page.
 *
 * The decision comes from the `argos_logged_in` hint, so it is made on the first
 * render with no round trip and a guarded page paints as fast as any other. The
 * Suspense boundary is for children that go on to read the account itself via
 * `useAssertAuthAccount`; children that don't never suspend, so they never see
 * the fallback.
 */
export function AuthGuard(props: { children: () => React.ReactNode }) {
  const auth = useAuth();

  if (auth.status === "anonymous") {
    return <RedirectToWebsite />;
  }

  return <Suspense fallback={<PageLoader />}>{props.children()}</Suspense>;
}
