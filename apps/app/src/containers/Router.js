import React from "react";
import { useLocation, useResolvedPath } from "react-router-dom";

export function ScrollToTop({ children }) {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return children || null;
}

export function GoogleAnalytics({ children }) {
  const { href, pathname } = useLocation();
  const initializedRef = React.useRef(false);
  React.useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
    } else {
      window.gtag("config", "UA-101358560-6", {
        page_location: href,
        page_path: pathname,
      });
    }
  }, [href, pathname]);
  return children || null;
}

export function AbsoluteRedirect({ to }) {
  React.useLayoutEffect(() => {
    window.location = to;
  }, [to]);
  return null;
}

export function useIsMatchingTo({ to, exact }) {
  let { pathname: locationPathname } = useLocation();
  let { pathname: toPathname } = useResolvedPath(to);

  return (
    locationPathname === toPathname ||
    (!exact &&
      locationPathname.startsWith(toPathname) &&
      locationPathname.charAt(toPathname.length) === "/")
  );
}
