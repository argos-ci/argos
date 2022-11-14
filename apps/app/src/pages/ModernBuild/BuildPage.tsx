import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client";

import { BuildHeader } from "./BuildHeader";
import { BuildHotkeysDialog } from "./BuildHotkeys";
import type { BuildParams } from "./BuildParams";
import { OvercapacityBanner } from "./Overcapacity";
import type { Build } from "@/modern/containers/Build";
import type { Repository } from "@/modern/containers/Repository";
import { BuildWorkspace } from "./BuildWorkspace";
import { BuildNotFound } from "./BuildNotFound";
import { Route, Routes } from "react-router-dom";

const BuildQuery = gql`
  query BuildQuery(
    $ownerLogin: String!
    $repositoryName: String!
    $buildNumber: Int!
  ) {
    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {
      id
      referenceBranch
      name
      permissions
      private
      owner {
        id
        name
        login
        consumptionRatio
        plan {
          id
          name
        }
      }
      build(number: $buildNumber) {
        id
        createdAt
        type
        status
        batchCount
        totalBatch
        stats {
          total: screenshotCount
          failure: failedScreenshotCount
          changed: updatedScreenshotCount
          added: addedScreenshotCount
          removed: removedScreenshotCount
          unchanged: stableScreenshotCount
        }
        baseScreenshotBucket {
          id
          commit
          branch
          createdAt
        }
        compareScreenshotBucket {
          id
          commit
          branch
          createdAt
        }
      }
    }
  }
`;

interface BuildQueryData {
  repository: Pick<
    Repository,
    "id" | "referenceBranch" | "name" | "permissions" | "private"
  > & {
    owner: Pick<
      Repository["owner"],
      "id" | "name" | "login" | "consumptionRatio"
    > & {
      plan: Pick<
        Exclude<Repository["owner"]["plan"], null>,
        "id" | "name"
      > | null;
    };
    build:
      | (Pick<
          Exclude<Repository["build"], null>,
          | "id"
          | "createdAt"
          | "type"
          | "status"
          | "batchCount"
          | "totalBatch"
          | "stats"
        > & {
          baseScreenshotBucket: Pick<
            Exclude<Build["baseScreenshotBucket"], null>,
            "id" | "commit" | "branch" | "createdAt"
          > | null;
          compareScreenshotBucket: Pick<
            Build["compareScreenshotBucket"],
            "id" | "commit" | "branch" | "createdAt"
          >;
        })
      | null;
  };
}

export const BuildPage = ({ params }: { params: BuildParams }) => {
  const { data, error } = useQuery<BuildQueryData>(BuildQuery, {
    variables: {
      ownerLogin: params.ownerLogin,
      repositoryName: params.repositoryName,
      buildNumber: params.buildNumber,
    },
  });

  if (error) {
    throw error;
  }

  if (data && !data?.repository?.build) {
    return <BuildNotFound />;
  }

  return (
    <>
      <BuildHotkeysDialog />
      <div className="m flex h-screen min-h-0 flex-col">
        {data && (
          <OvercapacityBanner
            consumptionRatio={data.repository.owner.consumptionRatio}
            ownerLogin={params.ownerLogin}
            plan={data.repository.owner.plan}
          />
        )}
        <BuildHeader
          buildNumber={params.buildNumber}
          ownerLogin={params.ownerLogin}
          repositoryName={params.repositoryName}
          build={data?.repository.build ?? null}
          repository={data?.repository ?? null}
        />
        <BuildWorkspace
          params={params}
          build={data?.repository.build ?? null}
        />
      </div>
    </>
  );
};
