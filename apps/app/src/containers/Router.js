import { useEffect, useLayoutEffect } from "react";
import { useLocation, useResolvedPath } from "react-router-dom";

export function ScrollToTop({ children }) {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return children || null;
}

export function AbsoluteRedirect({ to }) {
  useLayoutEffect(() => {
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
