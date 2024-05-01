import { useSuspenseQuery } from "@apollo/client";
import { Navigate, useParams } from "react-router-dom";

import { graphql } from "@/gql";
import { NotFound } from "@/pages/NotFound";
import { Container } from "@/ui/Container";

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

function ProjectReference({
  accountSlug,
  projectName,
}: {
  accountSlug: string;
  projectName: string;
}) {
  const {
    data: { project },
  } = useSuspenseQuery(ProjectQuery, {
    variables: {
      accountSlug,
      projectName,
    },
  });

  if (!project) {
    return <NotFound />;
  }

  if (!project.latestReferenceBuild) {
    return (
      <Navigate to={`/${accountSlug}/${projectName}/builds`} replace={true} />
    );
  }

  return (
    <Navigate
      to={`/${accountSlug}/${projectName}/builds/${project.latestReferenceBuild.number}`}
      replace={true}
    />
  );
}

export function Component() {
  const { accountSlug, projectName } = useParams();

  if (!accountSlug || !projectName) {
    return <NotFound />;
  }

  return (
    <Container>
      <ProjectReference accountSlug={accountSlug} projectName={projectName} />
    </Container>
  );
}
