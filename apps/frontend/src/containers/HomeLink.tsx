import { ForwardedRef, forwardRef } from "react";
import { useLocation, useParams } from "react-router-dom";

import { HeadlessLink, HeadlessLinkProps } from "@/ui/Link";

import { getLatestVisitedAccount } from "./AccountHistory";
import { useAuthTokenPayload } from "./Auth";

export const HomeLink = forwardRef(function HomeLink(
  props: Omit<HeadlessLinkProps, "to">,
  ref: ForwardedRef<HTMLAnchorElement>,
) {
  const authPayload = useAuthTokenPayload();
  const params = useParams();
  const { pathname } = useLocation();

  const accountSlug =
    params.accountSlug ??
    getLatestVisitedAccount() ??
    authPayload?.account.slug ??
    "";
  return (
    <HeadlessLink
      ref={ref}
      href={
        pathname === "/login" || pathname === "/signup"
          ? "https://argos-ci.com"
          : `/${accountSlug}`
      }
      {...props}
    />
  );
});
