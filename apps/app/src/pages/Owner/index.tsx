import {
  Outlet,
  OutletProps,
  useOutletContext,
  useParams,
} from "react-router-dom";
import {
  TabLink,
  TabLinkList,
  TabLinkPanel,
  useTabLinkState,
} from "@/modern/ui/TabLink";
import { Main } from "@/modern/containers/Layout";
import { graphql } from "@/gql";
import { Query } from "@/containers/Apollo";
import { PageLoader } from "@/modern/ui/PageLoader";
import { NotFound } from "../NotFound";
import { Permission } from "@/gql/graphql";

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
