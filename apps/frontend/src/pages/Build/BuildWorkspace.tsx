import { memo } from "react";

import { BuildDiffDetail } from "@/containers/Build/BuildDiffDetail";
import { BuildStatusDescription } from "@/containers/BuildStatusDescription";
import { DocumentType, graphql } from "@/gql";
import { BuildStatus } from "@/gql/graphql";
import { EggLoader } from "@/ui/EggLoader";
import { Progress } from "@/ui/Progress";

import { BuildDetailHeader } from "./BuildDetailHeader";
import { useBuildDiffState } from "./BuildDiffState";
import { BuildOrphanDialog } from "./BuildOrphanDialog";
import { BuildParams } from "./BuildParams";
import { BuildSidebar } from "./BuildSidebar";

const _BuildFragment = graphql(`
  fragment BuildWorkspace_Build on Build {
    ...BuildSidebar_Build
    ...BuildStatusDescription_Build
    ...BuildDiffDetail_Build
    ...BuildOrphanDialog_Build
    status
    parallel {
      total
      received
      nonce
    }
  }
`);

const _ProjectFragment = graphql(`
  fragment BuildWorkspace_Project on Project {
    ...BuildOrphanDialog_Project
    repository {
      id
      url
    }
  }
`);

const BuildProgress = memo(function BuildProgress({
  parallel,
}: {
  parallel: DocumentType<typeof _BuildFragment>["parallel"];
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-10 p-10">
      <div className="text-4xl">Your build is cooking...</div>
      <div>
        <EggLoader />
      </div>
      {parallel && (
        <div className="w-80">
          {parallel.total > 0 && (
            <Progress
              className="mb-2 w-full"
              value={parallel.received}
              max={parallel.total}
              min={0}
            />
          )}
          <div className="mb-0.5 flex justify-between font-medium tabular-nums">
            <div>
              {parallel.received} batch{parallel.received > 1 ? "es" : ""}
            </div>
            {parallel.total > 0 && (
              <div className="text-low">/ {parallel.total}</div>
            )}
          </div>
          <div className="text-low mb-1 font-mono text-xs">
            {parallel.nonce}
          </div>
          {parallel.total === -1 && (
            <div className="text-sm">Waiting for build to be finalized.</div>
          )}
        </div>
      )}
    </div>
  );
});

export function BuildWorkspace(props: {
  params: BuildParams;
  build: DocumentType<typeof _BuildFragment>;
  project: DocumentType<typeof _ProjectFragment>;
}) {
  const { build, project } = props;
  const repoUrl = project.repository?.url ?? null;

  return (
    <div className="flex min-h-0 flex-1">
      <BuildSidebar build={build} repoUrl={repoUrl} params={props.params} />
      {(() => {
        switch (build.status) {
          case BuildStatus.Aborted:
          case BuildStatus.Error:
          case BuildStatus.Expired:
            return (
              <div className="min-h-0 flex-1 p-10 text-center text-xl">
                <BuildStatusDescription build={build} />
              </div>
            );
          case BuildStatus.Pending:
          case BuildStatus.Progress:
            return <BuildProgress parallel={build.parallel} />;
          default:
            return (
              build && (
                <>
                  <BuildDetail build={build} repoUrl={repoUrl} />
                  <BuildOrphanDialog build={build} project={project} />
                </>
              )
            );
        }
      })()}
    </div>
  );
}

function BuildDetail(props: {
  build: DocumentType<typeof _BuildFragment>;
  repoUrl: string | null;
}) {
  const { activeDiff, siblingDiffs } = useBuildDiffState();
  const { build, repoUrl } = props;
  return (
    <BuildDiffDetail
      build={build}
      diff={activeDiff}
      repoUrl={repoUrl}
      className="bg-subtle"
      header={
        activeDiff ? (
          <BuildDetailHeader
            diff={activeDiff}
            siblingDiffs={siblingDiffs}
            repoUrl={props.repoUrl}
            baseBranch={build.baseBranch ?? null}
            compareBranch={build.branch}
            prMerged={build.pullRequest?.merged ?? false}
            buildType={build.type ?? null}
          />
        ) : null
      }
    />
  );
}
