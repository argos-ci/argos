import React from "react";
import { __RouterContext } from "react-router-dom";

export function useRouter() {
  return React.useContext(__RouterContext);
}

export function ScrollToTop({ children }) {
  const {
    location: { pathname },
  } = useRouter();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return children || null;
}

export function GoogleAnalytics({ children }) {
  const {
    location: { href, pathname },
  } = useRouter();
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
