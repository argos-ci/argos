import { Navigate, useParams } from "react-router-dom";

import { Query } from "@/containers/Apollo";
import { graphql } from "@/gql";
import { NotFound } from "@/pages/NotFound";
import { Container } from "@/ui/Container";
import { PageLoader } from "@/ui/PageLoader";

const ProjectQuery = graphql(`
  query ProjectReference_project($accountSlug: String!, $projectName: String!) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      latestReferenceBuild {
        id
        number
      }
    }
  }
`);

export const ProjectReference = () => {
  const { accountSlug, projectName } = useParams();

  if (!accountSlug || !projectName) {
    return <NotFound />;
  }

  return (
    <Container>
      <Query
        fallback={<PageLoader />}
        query={ProjectQuery}
        variables={{
          accountSlug,
          projectName,
        }}
      >
        {({ project }) => {
          if (!project) {
            return <NotFound />;
          }

          if (!project?.latestReferenceBuild) {
            return (
              <Navigate
                to={`/${accountSlug}/${projectName}/builds`}
                replace={true}
              />
            );
          }

          return (
            <Navigate
              to={`/${accountSlug}/${projectName}/builds/${project.latestReferenceBuild.number}`}
              replace={true}
            />
          );
        }}
      </Query>
    </Container>
  );
};
