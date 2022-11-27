import { useQuery } from "@apollo/client";
import { useEffect } from "react";

import { graphql } from "@/gql";

import { BuildHeader } from "./BuildHeader";
import { BuildHotkeysDialog } from "./BuildHotkeys";
import { BuildNotFound } from "./BuildNotFound";
import type { BuildParams } from "./BuildParams";
import { BuildWorkspace } from "./BuildWorkspace";
import { OvercapacityBanner } from "./Overcapacity";

const BuildQuery = graphql(`
  query BuildQuery(
    $ownerLogin: String!
    $repositoryName: String!
    $buildNumber: Int!
  ) {
    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {
      id
      ...BuildHeader_Repository
      ...BuildWorkspace_Repository
      owner {
        id
        ...OvercapacityBanner_Owner
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
  const { data, error, refetch } = useQuery(BuildQuery, {
    variables: {
      ownerLogin: params.ownerLogin,
      repositoryName: params.repositoryName,
      buildNumber: params.buildNumber,
    },
  });

  const repository = data?.repository ?? null;
  const build = repository?.build ?? null;
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

  if (data && !data.repository?.build) {
    return <BuildNotFound />;
  }

  return (
    <>
      <BuildHotkeysDialog />
      <div className="m flex h-screen min-h-0 flex-col">
        {data?.repository?.owner && (
          <OvercapacityBanner
            owner={data.repository.owner}
            ownerLogin={params.ownerLogin}
          />
        )}
        <BuildHeader
          buildNumber={params.buildNumber}
          ownerLogin={params.ownerLogin}
          repositoryName={params.repositoryName}
          build={build}
          repository={data?.repository ?? null}
        />
        {repository && build ? (
          <BuildWorkspace
            params={params}
            build={build}
            repository={repository}
          />
        ) : null}
      </div>
    </>
  );
};
