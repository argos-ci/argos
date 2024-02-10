import { Outlet, useOutletContext, useParams } from "react-router-dom";

import { useVisitAccount } from "@/containers/AccountHistory";
import { Query } from "@/containers/Apollo";
import { PaymentBanner } from "@/containers/PaymentBanner";
import { DocumentType, graphql } from "@/gql";
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

const ProjectTabs = ({
  hasWritePermission,
  account,
}: {
  hasWritePermission: boolean;
  account: Account;
}) => {
  const tab = useTabLinkState();
  return (
    <>
      <TabLinkList state={tab} aria-label="Sections">
        <TabLink to="">Builds</TabLink>
        {hasWritePermission && (
          <TabLink to="settings">Project Settings</TabLink>
        )}
      </TabLinkList>
      <hr className="border-t" />
      <PaymentBanner account={account} />
      <TabLinkPanel
        state={tab}
        tabId={tab.selectedId || null}
        className="flex min-h-0 flex-1 flex-col"
      >
        <Outlet context={{ hasWritePermission } as OutletContext} />
      </TabLinkPanel>
    </>
  );
};

interface OutletContext {
  hasWritePermission: boolean;
}

export const useProjectContext = () => {
  return useOutletContext<OutletContext>();
};

export const Project = () => {
  const { accountSlug, projectName } = useParams();
  useVisitAccount(accountSlug ?? null);
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
          "write" as Permission,
        );

        if (hasWritePermission) {
          return (
            <ProjectTabs
              hasWritePermission={hasWritePermission}
              account={project.account}
            />
          );
        }

        return <Outlet context={{ hasWritePermission } as OutletContext} />;
      }}
    </Query>
  );
};
