import { Outlet, useOutletContext, useParams } from "react-router-dom";
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

const RepositoryQuery = graphql(`
  query Repository_repository($ownerLogin: String!, $repositoryName: String!) {
    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {
      id
      permissions
    }
  }
`);

const RepositoryTabs = () => {
  const tab = useTabLinkState();
  return (
    <>
      <TabLinkList state={tab} aria-label="Sections">
        <TabLink to="">Builds</TabLink>
        <TabLink to="settings">Settings</TabLink>
      </TabLinkList>
      <TabLinkPanel state={tab} as={Main} tabId={tab.selectedId || null}>
        <Outlet context={{ hasWritePermission: true } as OutletContext} />
      </TabLinkPanel>
    </>
  );
};

export interface OutletContext {
  hasWritePermission: boolean;
}

export const useRepositoryContext = () => {
  return useOutletContext<OutletContext>();
};

export const Repository = () => {
  const { ownerLogin, repositoryName } = useParams();
  if (!ownerLogin || !repositoryName) {
    return <NotFound />;
  }
  return (
    <Query
      fallback={<PageLoader />}
      query={RepositoryQuery}
      variables={{ ownerLogin, repositoryName }}
    >
      {({ repository }) => {
        if (!repository) return <NotFound />;
        if (!repository.permissions.includes("read" as Permission)) {
          return <NotFound />;
        }
        if (!repository.permissions.includes("write" as Permission)) {
          return (
            <Outlet context={{ hasWritePermission: false } as OutletContext} />
          );
        }
        return <RepositoryTabs />;
      }}
    </Query>
  );
};
