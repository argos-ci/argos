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

const RepositoryQuery = graphql(`
  query Repository_repository($ownerLogin: String!, $repositoryName: String!) {
    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {
      id
      permissions
      hasTests
    }
  }
`);

const RepositoryTabs = ({
  hasTests,
  hasWritePermission,
}: {
  hasTests: boolean;
  hasWritePermission: boolean;
}) => {
  const tab = useTabLinkState();
  return (
    <>
      <TabLinkList state={tab} aria-label="Sections">
        <TabLink to="">Builds</TabLink>
        {hasTests && <TabLink to="tests">Tests</TabLink>}
        {hasWritePermission && <TabLink to="settings">Settings</TabLink>}
      </TabLinkList>
      <TabLinkPanel state={tab} as={Main} tabId={tab.selectedId || null}>
        <Outlet context={{ hasWritePermission } as OutletContext} />
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

        const hasWritePermission = repository.permissions.includes(
          "write" as Permission
        );

        if (repository.hasTests || hasWritePermission) {
          return (
            <RepositoryTabs
              hasWritePermission={hasWritePermission}
              hasTests={repository.hasTests}
            />
          );
        }

        return <Outlet context={{ hasWritePermission } as OutletContext} />;
      }}
    </Query>
  );
};
