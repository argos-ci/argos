import { useEffect } from "react";
import { useQuery } from "@apollo/client/react";

import { PaymentBanner } from "@/containers/PaymentBanner";
import { ProjectPermissionsContext } from "@/containers/Project/PermissionsContext";
import { graphql } from "@/gql";
import { BuildStatus } from "@/gql/graphql";

import { BuildDiffProvider } from "./BuildDiffState";
import { BuildNotFound } from "./BuildNotFound";
import type { BuildParams } from "./BuildParams";
import { BuildReviewDialogProvider } from "./BuildReviewDialog";
import { BuildReviewStateProvider } from "./BuildReviewState";
import { BuildWorkspace } from "./BuildWorkspace";
import { BuildHeader } from "./header/BuildHeader";
import { OvercapacityBanner } from "./OvercapacityBanner";

const ProjectQuery = graphql(`
  query BuildPage_Project(
    $accountSlug: String!
    $projectName: String!
    $buildNumber: Int!
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      ...BuildHeader_Project
      ...BuildWorkspace_Project
      ...BuildReviewDialog_Project
      permissions
      account {
        id
        ...OvercapacityBanner_Account
        ...PaymentBanner_Account
      }
      build(number: $buildNumber) {
        id
        status
        ...BuildHeader_Build
        ...BuildWorkspace_Build
        ...BuildDiffState_Build
      }
    }
  }
`);

export const BuildPage = ({ params }: { params: BuildParams }) => {
  const { data, refetch, error } = useQuery(ProjectQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
      buildNumber: params.buildNumber,
    },
  });
  if (error) {
    throw error;
  }

  const project = data?.project ?? null;
  const build = project?.build ?? null;
  const buildStatusProgress = Boolean(
    build?.status &&
      (build.status === BuildStatus.Pending ||
        build.status === BuildStatus.Progress),
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

  if (data && !data.project?.build) {
    return <BuildNotFound />;
  }

  return (
    <ProjectPermissionsContext value={data?.project?.permissions ?? null}>
      <BuildDiffProvider params={params} build={build}>
        <BuildReviewStateProvider
          params={params}
          buildStatus={data?.project?.build?.status ?? null}
          buildType={data?.project?.build?.type ?? null}
        >
          <BuildReviewDialogProvider project={data?.project ?? null}>
            <div className="flex h-screen min-h-0 flex-col">
              {data?.project?.account && (
                <>
                  <PaymentBanner account={data.project.account} />
                  <OvercapacityBanner
                    account={data.project.account}
                    accountSlug={params.accountSlug}
                  />
                </>
              )}
              <BuildHeader
                buildNumber={params.buildNumber}
                accountSlug={params.accountSlug}
                projectName={params.projectName}
                build={build}
                project={data?.project ?? null}
              />
              {project && build ? (
                <BuildWorkspace
                  params={params}
                  build={build}
                  project={project}
                />
              ) : null}
            </div>
          </BuildReviewDialogProvider>
        </BuildReviewStateProvider>
      </BuildDiffProvider>
    </ProjectPermissionsContext>
  );
};
