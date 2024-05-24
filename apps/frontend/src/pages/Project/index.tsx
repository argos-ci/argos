import { useSuspenseQuery } from "@apollo/client";
import { Outlet, useOutletContext, useParams } from "react-router-dom";

import { useVisitAccount } from "@/containers/AccountHistory";
import { PaymentBanner } from "@/containers/PaymentBanner";
import { DocumentType, graphql } from "@/gql";
import { ProjectPermission } from "@/gql/graphql";
import { TabLink, TabLinkList, TabLinkPanel, TabsLink } from "@/ui/TabLink";

import { NotFound } from "../NotFound";

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

function ProjectTabs({
  permissions,
  account,
}: {
  permissions: ProjectPermission[];
  account: Account;
}) {
  return (
    <TabsLink className="flex min-h-0 flex-1 flex-col">
      <TabLinkList aria-label="Sections">
        <TabLink href="">Builds</TabLink>
        {permissions.includes(ProjectPermission.ViewSettings) && (
          <TabLink href="settings">Project Settings</TabLink>
        )}
      </TabLinkList>
      <hr className="border-t" />
      <PaymentBanner account={account} />
      <TabLinkPanel className="flex min-h-0 flex-1 flex-col">
        <Outlet context={{ permissions } as OutletContext} />
      </TabLinkPanel>
    </TabsLink>
  );
}

interface OutletContext {
  permissions: ProjectPermission[];
}

export function useProjectContext() {
  return useOutletContext<OutletContext>();
}

function Project({
  accountSlug,
  projectName,
}: {
  accountSlug: string;
  projectName: string;
}) {
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

  if (project.permissions.includes(ProjectPermission.ViewSettings)) {
    return (
      <ProjectTabs
        permissions={project.permissions}
        account={project.account}
      />
    );
  }

  return (
    <Outlet context={{ permissions: project.permissions } as OutletContext} />
  );
}

/** @route */
export function Component() {
  const { accountSlug, projectName } = useParams();
  useVisitAccount(accountSlug ?? null);
  if (!accountSlug || !projectName) {
    return <NotFound />;
  }
  return <Project accountSlug={accountSlug} projectName={projectName} />;
}
