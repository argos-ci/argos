import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";

import { Query } from "@/containers/Apollo";
import { SettingsLayout } from "@/containers/Layout";
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
import { Container } from "@/ui/Container";
import { PageLoader } from "@/ui/PageLoader";
import { Heading } from "@/ui/Typography";

import { useProjectContext } from ".";

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

/** @route */
export function Component() {
  const { accountSlug, projectName } = useParams();
  const { permissions } = useProjectContext();

  if (!accountSlug || !projectName) {
    return <NotFound />;
  }

  const hasViewSettingsPermission = permissions.includes(
    ProjectPermission.ViewSettings,
  );

  if (!hasViewSettingsPermission) {
    return <NotFound />;
  }

  const hasAdminPermission = permissions.includes(ProjectPermission.Admin);
  const hasReviewPermission = permissions.includes(ProjectPermission.Review);

  return (
    <Container className="py-10">
      <Helmet>
        <title>
          {accountSlug}/{projectName} • Settings
        </title>
      </Helmet>
      <Heading>Project Settings</Heading>
      <Query
        fallback={<PageLoader />}
        query={ProjectQuery}
        variables={{
          accountSlug,
          projectName,
        }}
      >
        {({ project, account }) => {
          if (!project || !account) {
            return <NotFound />;
          }

          const isTeam = account.__typename === "Team";
          const fineGrainedAccessControlIncluded = Boolean(
            isTeam && account.plan?.fineGrainedAccessControlIncluded,
          );

          return (
            <SettingsLayout>
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
            </SettingsLayout>
          );
        }}
      </Query>
    </Container>
  );
}
