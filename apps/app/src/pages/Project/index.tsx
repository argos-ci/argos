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

const ProjectQuery = graphql(`
  query Project_project($accountSlug: String!, $projectName: String!) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      permissions
      hasTests
    }
  }
`);

const ProjectTabs = ({
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

export const useProjectContext = () => {
  return useOutletContext<OutletContext>();
};

export const Project = () => {
  const { accountSlug, projectName } = useParams();
  if (!accountSlug || !projectName) {
    return <NotFound />;
  }
  return (
    <Query
      fallback={<PageLoader />}
      query={ProjectQuery}
      variables={{ accountSlug, projectName }}
    >
      {({ project }) => {
        if (!project) return <NotFound />;
        if (!project.permissions.includes("read" as Permission)) {
          return <NotFound />;
        }

        const hasWritePermission = project.permissions.includes(
          "write" as Permission
        );

        if (project.hasTests || hasWritePermission) {
          return (
            <ProjectTabs
              hasWritePermission={hasWritePermission}
              hasTests={project.hasTests}
            />
          );
        }

        return <Outlet context={{ hasWritePermission } as OutletContext} />;
      }}
    </Query>
  );
};
