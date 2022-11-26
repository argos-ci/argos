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

const OwnerQuery = graphql(`
  query Owner_owner($ownerLogin: String!) {
    owner(login: $ownerLogin) {
      id
      permissions
    }
  }
`);

export interface OutletContext {
  hasWritePermission: boolean;
}

export const useOwnerContext = () => {
  return useOutletContext<OutletContext>();
};

const OwnerTabs = () => {
  const tab = useTabLinkState();
  return (
    <>
      <TabLinkList state={tab} aria-label="Sections">
        <TabLink to="">Repositories</TabLink>
        <TabLink to="settings">Settings</TabLink>
      </TabLinkList>
      <TabLinkPanel state={tab} as={Main} tabId={tab.selectedId || null}>
        <Outlet context={{ hasWritePermission: true } as OutletContext} />
      </TabLinkPanel>
    </>
  );
};

export const Owner = () => {
  const { ownerLogin } = useParams();
  if (!ownerLogin) {
    return <NotFound />;
  }
  return (
    <Query
      fallback={<PageLoader />}
      query={OwnerQuery}
      variables={{ ownerLogin }}
    >
      {({ owner }) => {
        if (!owner) {
          return <NotFound />;
        }
        if (!owner.permissions.includes("read" as Permission)) {
          return <NotFound />;
        }
        if (!owner.permissions.includes("write" as Permission)) {
          return (
            <Outlet context={{ hasWritePermission: false } as OutletContext} />
          );
        }
        return <OwnerTabs />;
      }}
    </Query>
  );
};
