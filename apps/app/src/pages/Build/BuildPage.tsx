import { useQuery } from "@apollo/client";
import { useEffect } from "react";

import { graphql } from "@/gql";

import { BuildHeader } from "./BuildHeader";
import { BuildHotkeysDialog } from "./BuildHotkeys";
import { BuildNotFound } from "./BuildNotFound";
import type { BuildParams } from "./BuildParams";
import { BuildWorkspace } from "./BuildWorkspace";
import { OvercapacityBanner } from "./Overcapacity";

const ProjectQuery = graphql(`
  query BuildPage_Project(
    $accountSlug: String!
    $projectSlug: String!
    $buildNumber: Int!
  ) {
    project(accountSlug: $accountSlug, projectSlug: $projectSlug) {
      id
      ...BuildHeader_Project
      ...BuildWorkspace_Project
      account {
        id
        ...OvercapacityBanner_Account
      }
      build(number: $buildNumber) {
        id
        status
        ...BuildHeader_Build
        ...BuildWorkspace_Build
      }
    }
  }
`);

export const BuildPage = ({ params }: { params: BuildParams }) => {
  const { data, error, refetch } = useQuery(ProjectQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectSlug: params.projectSlug,
      buildNumber: params.buildNumber,
    },
  });

  const project = data?.project ?? null;
  const build = project?.build ?? null;
  const buildStatusProgress = Boolean(
    build?.status && (build.status === "pending" || build.status === "progress")
  );

  useEffect(() => {
    if (buildStatusProgress) {
      const interval = setInterval(() => {
        refetch();
      }, 2000);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [buildStatusProgress, refetch]);

  if (error) {
    throw error;
  }

  if (data && !data.project?.build) {
    return <BuildNotFound />;
  }

  return (
    <>
      <BuildHotkeysDialog />
      <div className="m flex h-screen min-h-0 flex-col">
        {data?.project?.account && (
          <OvercapacityBanner
            account={data.project.account}
            accountSlug={params.accountSlug}
          />
        )}
        <BuildHeader
          buildNumber={params.buildNumber}
          accountSlug={params.accountSlug}
          projectSlug={params.projectSlug}
          build={build}
          project={data?.project ?? null}
        />
        {project && build ? (
          <BuildWorkspace params={params} build={build} project={project} />
        ) : null}
      </div>
    </>
  );
};
