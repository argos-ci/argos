import { Suspense } from "react";
import { useSuspenseQuery } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import { Outlet, useOutletContext, useParams } from "react-router-dom";

import { useVisitAccount } from "@/containers/AccountHistory";
import { PaymentBanner } from "@/containers/PaymentBanner";
import { DocumentType, graphql } from "@/gql";
import { AccountPermission } from "@/gql/graphql";
import { PageLoader } from "@/ui/PageLoader";
import {
  TabLink,
  TabLinkList,
  TabLinkPanel,
  TabsLink,
  useTabLinkSplat,
} from "@/ui/TabLink";

import { NotFound } from "../NotFound";

const AccountQuery = graphql(`
  query Account_account($slug: String!) {
    account(slug: $slug) {
      id
      slug
      permissions
      ...PaymentBanner_Account
    }
  }
`);

type Account = NonNullable<DocumentType<typeof AccountQuery>["account"]>;

type OutletContext = {
  permissions: AccountPermission[];
};

export const useAccountContext = () => {
  return useOutletContext<OutletContext>();
};

function AccountTabs({ account }: { account: Account }) {
  const selectedKey = useTabLinkSplat("settings");
  return (
    <TabsLink
      selectedKey={selectedKey}
      className="flex min-h-0 flex-1 flex-col"
    >
      <TabLinkList aria-label="Account navigation">
        <TabLink href="">Projects</TabLink>
        <TabLink href="~/analytics">Analytics</TabLink>
        <TabLink href="settings">Settings</TabLink>
      </TabLinkList>
      <hr className="border-t" />
      <PaymentBanner account={account} />
      <TabLinkPanel id={selectedKey} className="flex flex-1 flex-col">
        <Suspense fallback={<PageLoader />}>
          <Outlet
            context={{ permissions: account.permissions } as OutletContext}
          />
        </Suspense>
      </TabLinkPanel>
    </TabsLink>
  );
}

function useAccountParams() {
  const { accountSlug } = useParams();
  invariant(accountSlug);
  return { accountSlug };
}

/** @route */
export function Component() {
  const { accountSlug } = useAccountParams();
  useVisitAccount(accountSlug);
  const { data } = useSuspenseQuery(AccountQuery, {
    variables: { slug: accountSlug },
  });
  const account = data.account;
  if (!account) {
    return <NotFound />;
  }
  if (!account.permissions.includes(AccountPermission.View)) {
    return <NotFound />;
  }
  return <AccountTabs account={account} />;
}
