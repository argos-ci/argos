import { useEffect } from "react";

import { useSafeQuery } from "@/containers/Apollo";
import { PaymentBanner } from "@/containers/PaymentBanner";
import { graphql } from "@/gql";
import { BuildStatus } from "@/gql/graphql";

import { BuildContextProvider } from "./BuildContext";
import { BuildDiffColorStateProvider } from "./BuildDiffColorState";
import { BuildDiffHighlighterProvider } from "./BuildDiffHighlighterContext";
import { BuildDiffProvider } from "./BuildDiffState";
import { BuildHotkeysDialog } from "./BuildHotkeys";
import { useBuildHotkeysDialogState } from "./BuildHotkeysDialogState";
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
  const { data, refetch } = useSafeQuery(ProjectQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
      buildNumber: params.buildNumber,
    },
  });

  const project = data?.project ?? null;
  const build = project?.build ?? null;
  const buildStatusProgress = Boolean(
    build?.status &&
      (build.status === BuildStatus.Pending ||
        build.status === BuildStatus.Progress),
  );
  const hotkeysDialog = useBuildHotkeysDialogState();

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
    <BuildContextProvider permissions={data?.project?.permissions ?? null}>
      <BuildDiffProvider params={params} build={build}>
        <BuildDiffColorStateProvider>
          <BuildDiffHighlighterProvider>
            <BuildReviewStateProvider
              params={params}
              buildStatus={data?.project?.build?.status ?? null}
            >
              <BuildReviewDialogProvider project={data?.project ?? null}>
                {hotkeysDialog && <BuildHotkeysDialog state={hotkeysDialog} />}
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
          </BuildDiffHighlighterProvider>
        </BuildDiffColorStateProvider>
      </BuildDiffProvider>
    </BuildContextProvider>
  );
};
