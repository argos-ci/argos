import { useSuspenseQuery } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import { useFeature } from "@bucketco/react-sdk";
import { Outlet } from "react-router-dom";

import { useVisitAccount } from "@/containers/AccountHistory";
import { PaymentBanner } from "@/containers/PaymentBanner";
import { DocumentType, graphql } from "@/gql";
import { ProjectPermission } from "@/gql/graphql";
import { TabLink, TabLinkList, TabLinkPanel, TabsLink } from "@/ui/TabLink";

import { NotFound } from "../NotFound";
import { useTestParams } from "../Test/TestParams";
import type { ProjectOutletContext } from "./ProjectOutletContext";
import { useProjectParams, type ProjectParams } from "./ProjectParams";

const ProjectQuery = graphql(`
  query Project_project($accountSlug: String!, $projectName: String!) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      permissions
      name
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

function ProjectTabLinkList(props: {
  permissions: ProjectPermission[];
  isTeam: boolean;
}) {
  const { permissions, isTeam } = props;
  const automationFeature = useFeature("automations");
  const showAutomationsTab =
    isTeam &&
    permissions.includes(ProjectPermission.ViewSettings) &&
    automationFeature.isEnabled;

  return (
    <TabLinkList aria-label="Project navigation">
      <TabLink href="">Builds</TabLink>
      {showAutomationsTab && <TabLink href="automations">Automations</TabLink>}
      {permissions.includes(ProjectPermission.ViewSettings) && (
        <TabLink href="settings">Project Settings</TabLink>
      )}
    </TabLinkList>
  );
}

function ProjectTabs(props: {
  permissions: ProjectPermission[];
  account: Account;
  children: React.ReactNode;
}) {
  const { account, children, permissions } = props;
  const isTeam = account.__typename === "Team";

  return (
    <TabsLink className="flex min-h-0 flex-1 flex-col">
      <ProjectTabLinkList permissions={permissions} isTeam={isTeam} />
      <hr className="border-t" />
      <PaymentBanner account={account} />
      <TabLinkPanel className="flex min-h-0 flex-1 flex-col">
        {children}
      </TabLinkPanel>
    </TabsLink>
  );
}

function Project(props: ProjectParams) {
  const { accountSlug, projectName } = props;
  const testParams = useTestParams();
  const {
    data: { project },
  } = useSuspenseQuery(ProjectQuery, {
    variables: { accountSlug, projectName },
  });

  if (!project) {
    return <NotFound />;
  }

  if (!project.permissions.includes(ProjectPermission.View)) {
    return <NotFound />;
  }

  const outlet = (
    <Outlet
      context={
        {
          permissions: project.permissions,
        } satisfies ProjectOutletContext
      }
    />
  );

  if (
    project.permissions.includes(ProjectPermission.ViewSettings) &&
    !testParams
  ) {
    return (
      <ProjectTabs account={project.account} permissions={project.permissions}>
        {outlet}
      </ProjectTabs>
    );
  }

  return (
    <>
      <hr className="border-t" />
      {outlet}
    </>
  );
}

/** @route */
export function Component() {
  const params = useProjectParams();
  invariant(params, "Can't be used outside of a test route");
  useVisitAccount(params.accountSlug);
  return (
    <Project
      accountSlug={params.accountSlug}
      projectName={params.projectName}
    />
  );
}
