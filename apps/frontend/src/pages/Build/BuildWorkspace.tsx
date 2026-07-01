import { memo } from "react";
import { useAtomValue } from "jotai";

import { BuildDiffDetail } from "@/containers/Build/BuildDiffDetail";
import { BuildDiffHighlighterProvider } from "@/containers/Build/BuildDiffHighlighterContext";
import { snapshotTypeAtom } from "@/containers/Build/SnapshotType";
import { ZoomerSyncProvider } from "@/containers/Build/Zoomer";
import { BuildStatusDescription } from "@/containers/BuildStatusDescription";
import { DocumentType, graphql } from "@/gql";
import { BuildStatus, BuildType } from "@/gql/graphql";
import { Alert, AlertText, AlertTitle } from "@/ui/Alert";
import { EggLoader } from "@/ui/EggLoader";
import { Progress } from "@/ui/Progress";

import { Code } from "../../ui/Code";
import { Link } from "../../ui/Link";
import { BuildDetailHeader } from "./BuildDetailHeader";
import { useBuildDiffState } from "./BuildDiffState";
import { BuildOverview } from "./BuildOverview";
import { BuildParams } from "./BuildParams";
import { BuildLeftSidebar } from "./LeftSidebar";
import { RightSidebar } from "./RightSidebar";

const _BuildFragment = graphql(`
  fragment BuildWorkspace_Build on Build {
    ...BuildLeftSidebar_Build
    ...BuildStatusDescription_Build
    ...BuildDiffDetail_Build
    ...RightSidebar_Build
    ...BuildOverview_Build
    status
    subset
    parallel {
      total
      received
      nonce
    }
  }
`);

const _ProjectFragment = graphql(`
  fragment BuildWorkspace_Project on Project {
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
              {parallel.total === -1 && " received"}
            </div>
            {parallel.total > 0 && (
              <div className="text-low">/ {parallel.total}</div>
            )}
          </div>
          <div className="text-low mb-1 font-mono text-xs">
            {parallel.nonce}
          </div>
          {parallel.total === -1 && (
            <div className="mt-4 space-y-1 border-l-2 pl-3 text-sm">
              <div className="text-sm">Waiting for build to be finalized.</div>
              <div>
                Run <Code>argos finalize</Code> to complete this build in{" "}
                <Link
                  href="https://argos-ci.com/docs/learn/how-to-guides/ci-pipelines/parallel-testing-sharding#modes"
                  target="_blank"
                >
                  manual parallel mode
                </Link>
                .
              </div>
            </div>
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
  const { build, project, params } = props;
  const repoUrl = project.repository?.url ?? null;

  return (
    <div className="flex min-h-0 flex-1">
      <BuildLeftSidebar build={build} repoUrl={repoUrl} params={params} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <BuildDetailProviders>
          <Toolbar build={build} />
          <div className="bg-subtle flex min-h-0 flex-1">
            {(() => {
              switch (build.status) {
                case BuildStatus.Aborted:
                case BuildStatus.Error:
                case BuildStatus.Expired:
                  return (
                    <div className="min-h-0 flex-1 p-6 text-xl">
                      <Alert className="mx-auto max-w-xl rounded-sm border p-4">
                        <AlertTitle>
                          {
                            {
                              [BuildStatus.Error]: "Build failed",
                              [BuildStatus.Expired]: "Build expired",
                              [BuildStatus.Aborted]: "Build aborted",
                            }[build.status]
                          }
                        </AlertTitle>
                        <AlertText>
                          <BuildStatusDescription build={build} />
                        </AlertText>
                      </Alert>
                    </div>
                  );
                case BuildStatus.Pending:
                case BuildStatus.Progress:
                  return <BuildProgress parallel={build.parallel} />;
                default:
                  if (
                    !params.diffId &&
                    build.type !== BuildType.Skipped &&
                    (build.stats?.total ?? 0) > 0
                  ) {
                    return <BuildOverview build={build} />;
                  }
                  return (
                    build && <BuildDetail build={build} repoUrl={repoUrl} />
                  );
              }
            })()}
            <RightSidebar
              build={build}
              repoUrl={repoUrl}
              baseBranch={build.baseBranch ?? null}
              compareBranch={build.branch}
              deploymentUrl={build.deployment?.url ?? null}
              prMerged={build.pullRequest?.merged ?? false}
            />
          </div>
        </BuildDetailProviders>
      </div>
    </div>
  );
}

function BuildDetailProviders(props: { children: React.ReactNode }) {
  const { children } = props;
  const { activeDiff } = useBuildDiffState();
  if (!activeDiff) {
    return children;
  }
  return (
    <ZoomerSyncProvider id={activeDiff.id}>
      <BuildDiffHighlighterProvider>{children}</BuildDiffHighlighterProvider>
    </ZoomerSyncProvider>
  );
}

function Toolbar(props: { build: DocumentType<typeof _BuildFragment> }) {
  const { build } = props;
  const { activeDiff } = useBuildDiffState();
  if (!activeDiff) {
    return null;
  }
  return (
    <div className="border-b-thin sticky top-0 z-20 shrink-0 p-2">
      <BuildDetailHeader
        diff={activeDiff}
        buildType={build.type ?? null}
        isSubsetBuild={build.subset}
      />
    </div>
  );
}

function BuildDetail(props: {
  build: DocumentType<typeof _BuildFragment>;
  repoUrl: string | null;
}) {
  const { activeDiff, ariaDiff } = useBuildDiffState();
  const { build, repoUrl } = props;
  const snapshotType = useAtomValue(snapshotTypeAtom);
  const shownDiff = snapshotType === "aria" && ariaDiff ? ariaDiff : activeDiff;
  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <BuildDiffDetail build={build} diff={shownDiff} repoUrl={repoUrl} />
    </div>
  );
}
