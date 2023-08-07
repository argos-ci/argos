import { Outlet, useOutletContext, useParams } from "react-router-dom";

import { useVisitAccount } from "@/containers/AccountHistory";
import { Query } from "@/containers/Apollo";
import { PaymentBanner } from "@/containers/PaymentBanner";
import { DocumentType, graphql } from "@/gql";
import { Permission } from "@/gql/graphql";
import { PageLoader } from "@/ui/PageLoader";
import {
  TabLink,
  TabLinkList,
  TabLinkPanel,
  useTabLinkState,
} from "@/ui/TabLink";

import { NotFound } from "../NotFound";

const AccountQuery = graphql(`
  query Account_account($slug: String!) {
    account(slug: $slug) {
      id
      permissions
      ...PaymentBanner_Account
    }
  }
`);

type Account = NonNullable<DocumentType<typeof AccountQuery>["account"]>;

export interface OutletContext {
  hasWritePermission: boolean;
}

export const useAccountContext = () => {
  return useOutletContext<OutletContext>();
};

const AccountTabs = ({ account }: { account: Account }) => {
  const tab = useTabLinkState();
  return (
    <>
      <TabLinkList state={tab} aria-label="Sections">
        <TabLink to="">Projects</TabLink>
        <TabLink to="settings">Settings</TabLink>
      </TabLinkList>
      <hr className="border-t-border" />
      <PaymentBanner account={account} />
      <TabLinkPanel
        state={tab}
        tabId={tab.selectedId || null}
        className="flex flex-1 flex-col"
      >
        <Outlet context={{ hasWritePermission: true } as OutletContext} />
      </TabLinkPanel>
    </>
  );
};

export const Account = () => {
  const { accountSlug } = useParams();
  if (!accountSlug) {
    throw new Error("Missing accountSlug");
  }
  useVisitAccount(accountSlug);
  return (
    <Query
      fallback={<PageLoader />}
      query={AccountQuery}
      variables={{ slug: accountSlug }}
    >
      {({ account }) => {
        if (!account) {
          return <NotFound />;
        }
        if (!account.permissions.includes("read" as Permission)) {
          return <NotFound />;
        }
        return <AccountTabs account={account} />;
      }}
    </Query>
  );
};
