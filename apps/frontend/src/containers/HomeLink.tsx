import { useLocation, useParams } from "react-router-dom";

import { getAccountURL } from "@/pages/Account/AccountParams";
import { HeadlessLink, HeadlessLinkProps } from "@/ui/Link";

import { getLatestVisitedAccount } from "./AccountHistory";
import { useAuthTokenPayload } from "./Auth";

export function HomeLink(props: Omit<HeadlessLinkProps, "to">) {
  const authPayload = useAuthTokenPayload();
  const params = useParams();
  const { pathname } = useLocation();
  const accountSlug =
    params.accountSlug ??
    (authPayload ? getLatestVisitedAccount(authPayload.account.id) : null) ??
    authPayload?.account.slug ??
    "";
  return (
    <HeadlessLink
      href={
        pathname === "/login" || pathname === "/signup"
          ? "https://argos-ci.com"
          : getAccountURL({ accountSlug })
      }
      {...props}
    />
  );
}
