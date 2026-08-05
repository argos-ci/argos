import { useLocation, useParams } from "react-router";

import { getAccountURL } from "@/pages/Account/AccountParams";
import { HeadlessLink, HeadlessLinkProps } from "@/ui/Link";

import { getLatestVisitedAccount } from "./AccountHistory";
import { useAuth } from "./Auth";

export function HomeLink(props: Omit<HeadlessLinkProps, "to">) {
  const auth = useAuth();
  // Null until `me` lands; the link target simply refines when it does.
  const account = auth.status === "authenticated" ? auth.account : null;
  const params = useParams();
  const { pathname } = useLocation();
  const accountSlug =
    params.accountSlug ??
    (account ? getLatestVisitedAccount(account.id) : null) ??
    account?.slug ??
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
