import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";

import { Query } from "@/containers/Apollo";
import { SettingsLayout } from "@/containers/Layout";
import { ProjectChangeName } from "@/containers/Project/ChangeName";
import { ProjectDelete } from "@/containers/Project/Delete";
import { ProjectReferenceBranch } from "@/containers/Project/ReferenceBranch";
import { ProjectToken } from "@/containers/Project/Token";
import { ProjectTransfer } from "@/containers/Project/Transfer";
import { ProjectVisibility } from "@/containers/Project/Visibility";
import { graphql } from "@/gql";
import { NotFound } from "@/pages/NotFound";
import { Container } from "@/ui/Container";
import { PageLoader } from "@/ui/PageLoader";
import { Heading } from "@/ui/Typography";

import { useProjectContext } from ".";

const ProjectQuery = graphql(`
  query ProjectSettings_project($accountSlug: String!, $projectName: String!) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      ...ProjectChangeName_Project
      ...ProjectToken_Project
      ...ProjectReferenceBranch_Project
      ...ProjectVisibility_Project
      ...ProjectTransfer_Project
      ...ProjectDelete_Project
    }
  }
`);

export const ProjectSettings = () => {
  const { accountSlug, projectName } = useParams();
  const { hasWritePermission } = useProjectContext();

  if (!accountSlug || !projectName) {
    return <NotFound />;
  }

  if (!hasWritePermission) {
    return <NotFound />;
  }

  return (
    <Container>
      <Helmet>
        <title>
          {accountSlug}/{projectName} • Project Settings
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
        {({ project }) => {
          if (!project) return <NotFound />;

          return (
            <SettingsLayout>
              <ProjectChangeName project={project} />
              <ProjectToken project={project} />
              <ProjectReferenceBranch project={project} />
              <ProjectVisibility project={project} />
              <ProjectTransfer project={project} />
              <ProjectDelete project={project} />
            </SettingsLayout>
          );
        }}
      </Query>
    </Container>
  );
};
