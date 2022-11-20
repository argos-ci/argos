import { useLayoutEffect } from "react";
import { useLocation, useResolvedPath } from "react-router-dom";

export const ScrollToTop = () => {
  const location = useLocation();
  useLayoutEffect(() => {
    document.documentElement.scrollTo(0, 0);
  }, [location.pathname]);
  return null;
};

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
