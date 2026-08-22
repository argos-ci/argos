import { Suspense } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { Outlet } from "react-router";

import { useVisitAccount } from "@/containers/AccountHistory";
import { PaymentBanner } from "@/containers/PaymentBanner";
import { DocumentType, graphql } from "@/gql";
import { ProjectPermission } from "@/gql/graphql";
import { PageLoader } from "@/ui/PageLoader";
import { TabLink, TabLinkPanel, TabsLink, TabLinkList } from "@/ui/TabLink";

import { NotFound } from "../NotFound";
import type { ProjectOutletContext } from "./ProjectOutletContext";
import { useProjectParams, type ProjectParams } from "./ProjectParams";

const ProjectQuery = graphql(`
  query Project_project($accountSlug: String!, $projectName: String!) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      permissions
      name
      deploymentEnabled
      ignoreConfig {
        enabled
      }
      repository {
        __typename
        id
      }
      account {
        id
        ...PaymentBanner_Account
      }
    }
  }
`);

type Account = NonNullable<
  NonNullable<DocumentType<typeof ProjectQuery>["project"]>["account"]
>;

function ProjectTabs(props: {
  deploymentEnabled: boolean;
  ignoreEnabled: boolean;
  pullRequestsEnabled: boolean;
  permissions: ProjectPermission[];
  account: Account;
  children: React.ReactNode;
}) {
  const {
    account,
    children,
    permissions,
    deploymentEnabled,
    ignoreEnabled,
    pullRequestsEnabled,
  } = props;
  const isTeam = account.__typename === "Team";
  const showAutomationsTab =
    isTeam && permissions.includes(ProjectPermission.ViewSettings);
  return (
    <TabsLink className="flex min-h-0 flex-1 flex-col">
      <TabLinkList className="px-4" aria-label="Project navigation">
        <TabLink href="">Builds</TabLink>
        <TabLink href="tests">Tests</TabLink>
        {pullRequestsEnabled && (
          <TabLink href="pull-requests">Pull requests</TabLink>
        )}
        {/* The ignore ledger is only meaningful while the feature is on; the
            page itself still explains itself if reached by a direct link. */}
        {ignoreEnabled && <TabLink href="ignored">Ignored</TabLink>}
        {deploymentEnabled && <TabLink href="deployments">Deployments</TabLink>}
        {showAutomationsTab && (
          <TabLink href="automations">Automations</TabLink>
        )}
        {permissions.includes(ProjectPermission.ViewSettings) && (
          <TabLink href="settings">Settings</TabLink>
        )}
      </TabLinkList>
      <hr className="border-t" />
      <PaymentBanner account={account} />
      <TabLinkPanel className="flex min-h-0 flex-1 flex-col">
        {children}
      </TabLinkPanel>
    </TabsLink>
  );
}

function Project(props: { params: ProjectParams }) {
  const { params } = props;
  const {
    data: { project },
  } = useSuspenseQuery(ProjectQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
    },
  });

  if (!project || !project.permissions.includes(ProjectPermission.View)) {
    return <NotFound />;
  }

  return (
    <ProjectTabs
      account={project.account}
      permissions={project.permissions}
      deploymentEnabled={project.deploymentEnabled}
      ignoreEnabled={project.ignoreConfig.enabled}
      // GitLab merge requests are not modeled, so the tab would always be
      // empty on a GitLab project — same for a project with no repository.
      pullRequestsEnabled={
        project.repository?.__typename === "GithubRepository" ||
        project.repository?.__typename === "OriginRepository"
      }
    >
      <Suspense fallback={<PageLoader />}>
        <Outlet
          context={
            {
              permissions: project.permissions,
            } satisfies ProjectOutletContext
          }
        />
      </Suspense>
    </ProjectTabs>
  );
}

export function Component() {
  const params = useProjectParams();
  invariant(params, "Can't be used outside of a project route");
  useVisitAccount(params.accountSlug);
  return <Project params={params} />;
}
