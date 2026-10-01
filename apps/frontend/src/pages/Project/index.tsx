import { Suspense } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { Outlet } from "react-router";

import { useVisitAccount } from "@/containers/AccountHistory";
import { PaymentBanner } from "@/containers/PaymentBanner";
import { GithubIpAllowListBanner } from "@/containers/Project/GithubIpAllowListBanner";
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
      account {
        id
        ...PaymentBanner_Account
      }
      ...GithubIpAllowListBanner_Project
    }
  }
`);

type ProjectDocument = NonNullable<
  DocumentType<typeof ProjectQuery>["project"]
>;

function ProjectTabs(props: {
  project: ProjectDocument;
  children: React.ReactNode;
}) {
  const { project, children } = props;
  const { account, permissions, deploymentEnabled } = project;
  const ignoreEnabled = project.ignoreConfig.enabled;
  const isTeam = account.__typename === "Team";
  const showAutomationsTab =
    isTeam && permissions.includes(ProjectPermission.ViewSettings);
  return (
    <TabsLink className="flex min-h-0 flex-1 flex-col">
      <TabLinkList className="px-4" aria-label="Project navigation">
        <TabLink href="">Builds</TabLink>
        <TabLink href="tests">Tests</TabLink>
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
      <GithubIpAllowListBanner project={project} />
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
    <ProjectTabs project={project}>
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
