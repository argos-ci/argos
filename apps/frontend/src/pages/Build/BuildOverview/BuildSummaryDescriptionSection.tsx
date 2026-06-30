import React from "react";

import { DocumentType, graphql } from "@/gql";
import { BuildMode, BuildStatus, BuildType } from "@/gql/graphql";

import { useBuildDiffState } from "../BuildDiffState";
import { Emphasis } from "./shared";

const _BuildFragment = graphql(`
  fragment BuildSummaryDescriptionSection_Build on Build {
    type
    status
    mode
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

function BuildSummaryDescription(props: { children: React.ReactNode }) {
  return <div className="mt-2 text-balance">{props.children}</div>;
}

function ChangesResume() {
  return (
    <BuildSummaryDescription>
      <Emphasis>Visual changes were detected in this build.</Emphasis> Please
      review the screenshots and confirm whether these changes are expected.
    </BuildSummaryDescription>
  );
}

export function BuildSummaryDescriptionSection({ build }: { build: Build }) {
  const { stats } = useBuildDiffState();
  const hasFailures = Boolean(stats?.failure);

  if (build.type === BuildType.Orphan) {
    return (
      <>
        <BuildSummaryDescription>
          Argos has nothing to compare this build against.
        </BuildSummaryDescription>
        <BuildSummaryDescription>
          It's common for a project&apos;s first builds, or when the current
          branch <Emphasis>hasn't been rebased</Emphasis> on a branch with an
          Argos build.
        </BuildSummaryDescription>
      </>
    );
  }

  if (hasFailures) {
    return (
      <>
        <BuildSummaryDescription>
          <Emphasis className="text-danger-low">
            At least one test failed in this build.
          </Emphasis>{" "}
          Its screenshots may be incomplete or show a broken state, so reviewing
          the changes won't be meaningful. The failure screenshots can still
          help you understand what went wrong.
        </BuildSummaryDescription>
        <BuildSummaryDescription>
          Fix the failing tests and re-run to get a build worth comparing.
        </BuildSummaryDescription>
      </>
    );
  }

  if (build.type === BuildType.Reference) {
    return (
      <BuildSummaryDescription>
        This build ran on the <Emphasis>base branch</Emphasis> and was
        automatically approved. It serves as a baseline for future comparisons.
      </BuildSummaryDescription>
    );
  }

  switch (build.status) {
    case BuildStatus.ChangesDetected:
      return <ChangesResume />;

    case BuildStatus.Accepted:
      return (
        <>
          {build.mode === BuildMode.Monitoring ? (
            <BuildSummaryDescription>
              The visual changes were approved. This build is now the baseline
              for future comparisons.
            </BuildSummaryDescription>
          ) : (
            <BuildSummaryDescription>
              The visual changes were approved — the status check now passes.
              This build will become the baseline once its pull request is
              merged.
            </BuildSummaryDescription>
          )}
        </>
      );

    case BuildStatus.Rejected:
      return (
        <>
          <BuildSummaryDescription>
            The visual changes in this build were rejected.
          </BuildSummaryDescription>
        </>
      );

    case BuildStatus.NoChanges:
      return (
        <>
          <BuildSummaryDescription>
            Every screenshot matches the baseline.
          </BuildSummaryDescription>
        </>
      );

    default:
      return null;
  }
}
