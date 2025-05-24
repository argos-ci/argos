import { useSuspenseQuery } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import { Outlet, useParams } from "react-router-dom";

import { useVisitAccount } from "@/containers/AccountHistory";
import { PaymentBanner } from "@/containers/PaymentBanner";
import { DocumentType, graphql } from "@/gql";
import { ProjectPermission } from "@/gql/graphql";
import { TabLink, TabLinkList, TabLinkPanel, TabsLink } from "@/ui/TabLink";

import { NotFound } from "../NotFound";
import type { ProjectOutletContext } from "./ProjectOutletContext";

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

function ProjectTabLinkList(props: { permissions: ProjectPermission[] }) {
  const { permissions } = props;
  return (
    <TabLinkList aria-label="Project navigation">
      <TabLink href="">Builds</TabLink>
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
  return (
    <TabsLink className="flex min-h-0 flex-1 flex-col">
      <ProjectTabLinkList permissions={permissions} />
      <hr className="border-t" />
      <PaymentBanner account={account} />
      <TabLinkPanel className="flex min-h-0 flex-1 flex-col">
        {children}
      </TabLinkPanel>
    </TabsLink>
  );
}

function Project(props: {
  accountSlug: string;
  projectName: string;
  testId: string | undefined;
}) {
  const { accountSlug, projectName, testId } = props;
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

  if (project.permissions.includes(ProjectPermission.ViewSettings) && !testId) {
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

function useProjectParams() {
  const { accountSlug, projectName, testId } = useParams();
  invariant(accountSlug);
  invariant(projectName);
  return { accountSlug, projectName, testId };
}

/** @route */
export function Component() {
  const { accountSlug, projectName, testId } = useProjectParams();
  useVisitAccount(accountSlug);
  return (
    <Project
      accountSlug={accountSlug}
      projectName={projectName}
      testId={testId}
    />
  );
}
