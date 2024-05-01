import { ForwardedRef, forwardRef } from "react";
import { Link, LinkProps, useParams } from "react-router-dom";

import { getLatestVisitedAccount } from "./AccountHistory";
import { useAuthTokenPayload } from "./Auth";

export const HomeLink = forwardRef(function HomeLink(
  props: Omit<LinkProps, "to">,
  ref: ForwardedRef<HTMLAnchorElement>,
) {
  const authPayload = useAuthTokenPayload();
  const params = useParams();
  const accountSlug =
    params.accountSlug ??
    getLatestVisitedAccount() ??
    authPayload?.account.slug ??
    "";
  return <Link ref={ref} to={`/${accountSlug}`} {...props} />;
});
