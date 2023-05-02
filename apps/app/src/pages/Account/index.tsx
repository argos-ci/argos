import { Outlet, useOutletContext, useParams } from "react-router-dom";

import { Query } from "@/containers/Apollo";
import { Main } from "@/containers/Layout";
import { graphql } from "@/gql";
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
    }
  }
`);

export interface OutletContext {
  hasWritePermission: boolean;
}

export const useAccountContext = () => {
  return useOutletContext<OutletContext>();
};

const AccountTabs = () => {
  const tab = useTabLinkState();
  return (
    <>
      <TabLinkList state={tab} aria-label="Sections">
        <TabLink to="">Projects</TabLink>
        <TabLink to="settings">Settings</TabLink>
      </TabLinkList>
      <TabLinkPanel state={tab} as={Main} tabId={tab.selectedId || null}>
        <Outlet context={{ hasWritePermission: true } as OutletContext} />
      </TabLinkPanel>
    </>
  );
};

export const Account = () => {
  const { accountSlug } = useParams();
  if (!accountSlug) {
    return <NotFound />;
  }
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
        return <AccountTabs />;
      }}
    </Query>
  );
};
