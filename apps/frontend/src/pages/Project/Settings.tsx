import { Suspense } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { Heading, Text } from "react-aria-components";

import { SettingsPage } from "@/containers/Layout";
import { ProjectBadge } from "@/containers/Project/Badge";
import { ProjectBranches } from "@/containers/Project/Branches";
import { ProjectChangeName } from "@/containers/Project/ChangeName";
import { ProjectContributors } from "@/containers/Project/Contributors";
import { ProjectDelete } from "@/containers/Project/Delete";
import { ProjectGitRepository } from "@/containers/Project/GitRepository";
import { ProjectStatusChecks } from "@/containers/Project/StatusChecks";
import { ProjectToken } from "@/containers/Project/Token";
import { ProjectTransfer } from "@/containers/Project/Transfer";
import { ProjectVisibility } from "@/containers/Project/Visibility";
import { graphql } from "@/gql";
import { ProjectPermission } from "@/gql/graphql";
import { NotFound } from "@/pages/NotFound";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
import { PageLoader } from "@/ui/PageLoader";

import { useProjectOutletContext } from "./ProjectOutletContext";
import { useProjectParams } from "./ProjectParams";
import { ProjectTitle } from "./ProjectTitle";

const ProjectQuery = graphql(`
  query ProjectSettings_project($accountSlug: String!, $projectName: String!) {
    account(slug: $accountSlug) {
      id
      ... on Team {
        plan {
          id
          fineGrainedAccessControlIncluded
        }
      }
    }

    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      ...ProjectBadge_Project
      ...ProjectChangeName_Project
      ...ProjectToken_Project
      ...ProjectBranches_Project
      ...ProjectStatusChecks_Project
      ...ProjectVisibility_Project
      ...ProjectTransfer_Project
      ...ProjectDelete_Project
      ...ProjectGitRepository_Project
      ...ProjectContributors_Project
    }
  }
`);

export function Component() {
  const params = useProjectParams();
  invariant(params, "it is a project route");
  const { accountSlug, projectName } = params;
  const { permissions } = useProjectOutletContext();

  const hasViewSettingsPermission = permissions.includes(
    ProjectPermission.ViewSettings,
  );

  if (!hasViewSettingsPermission) {
    return <NotFound />;
  }

  return (
    <Page>
      <ProjectTitle params={params}>Settings</ProjectTitle>
      <PageContainer>
        <PageHeader>
          <PageHeaderContent>
            <Heading>Project Settings</Heading>
            <Text slot="headline">
              Configure the settings for this project.
            </Text>
          </PageHeaderContent>
        </PageHeader>
        <Suspense
          fallback={
            <SettingsPage>
              <PageLoader />
            </SettingsPage>
          }
        >
          <PageContent accountSlug={accountSlug} projectName={projectName} />
        </Suspense>
      </PageContainer>
    </Page>
  );
}

function PageContent(props: { accountSlug: string; projectName: string }) {
  const { permissions } = useProjectOutletContext();
  const {
    data: { account, project },
  } = useSuspenseQuery(ProjectQuery, {
    variables: {
      accountSlug: props.accountSlug,
      projectName: props.projectName,
    },
  });

  if (!project || !account) {
    return <NotFound />;
  }

  const hasAdminPermission = permissions.includes(ProjectPermission.Admin);
  const hasReviewPermission = permissions.includes(ProjectPermission.Review);

  const isTeam = account.__typename === "Team";
  const fineGrainedAccessControlIncluded = Boolean(
    isTeam && account.plan?.fineGrainedAccessControlIncluded,
  );

  return (
    <SettingsPage>
      {hasAdminPermission && <ProjectChangeName project={project} />}
      {hasReviewPermission && <ProjectToken project={project} />}
      {hasAdminPermission && <ProjectGitRepository project={project} />}
      {hasAdminPermission && <ProjectBranches project={project} />}
      {hasAdminPermission && <ProjectStatusChecks project={project} />}
      <ProjectBadge project={project} />
      {hasAdminPermission && <ProjectVisibility project={project} />}
      {fineGrainedAccessControlIncluded && (
        <ProjectContributors project={project} />
      )}
      {hasAdminPermission && <ProjectTransfer project={project} />}
      {hasAdminPermission && <ProjectDelete project={project} />}
    </SettingsPage>
  );
}
