import { useSuspenseQuery } from "@apollo/client/react";
import { Navigate, useParams } from "react-router-dom";

import { graphql } from "@/gql";
import { NotFound } from "@/pages/NotFound";
import { Container } from "@/ui/Container";

import { getBuildURL } from "../Build/BuildParams";
import { getProjectURL } from "./ProjectParams";

const ProjectQuery = graphql(`
  query ProjectLatestAutoApproved_project(
    $accountSlug: String!
    $projectName: String!
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      latestAutoApprovedBuild {
        id
        number
      }
    }
  }
`);

function NavigateToLatestAutoApproved({
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

  if (!project.latestAutoApprovedBuild) {
    return (
      <Navigate
        to={`${getProjectURL({ accountSlug, projectName })}/builds`}
        replace={true}
      />
    );
  }

  return (
    <Navigate
      to={getBuildURL({
        accountSlug,
        projectName,
        buildNumber: project.latestAutoApprovedBuild.number,
      })}
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
      <NavigateToLatestAutoApproved
        accountSlug={accountSlug}
        projectName={projectName}
      />
    </Container>
  );
}
