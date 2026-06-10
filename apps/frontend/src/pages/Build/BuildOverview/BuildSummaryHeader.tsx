import React from "react";
import { clsx } from "clsx";

import { DocumentType, graphql } from "@/gql";
import { BuildMode, BuildStatus, BuildType } from "@/gql/graphql";
import { getBuildDescriptor } from "@/util/build";

import { useBuildDiffState } from "../BuildDiffState";
import { Emphasis } from "./shared";

const _BuildFragment = graphql(`
  fragment BuildSummaryHeader_Build on Build {
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

export function getBuildSummaryTitle(props: {
  build: Build;
  hasFailures: boolean;
}) {
  const descriptor = getBuildDescriptor(props.build.type, props.build.status);

  if (props.build.type === BuildType.Orphan) {
    return "No baseline yet";
  }

  // Failed tests take precedence over the visual outcome: the build can't be
  // trusted as a baseline regardless of the changes it contains.
  if (props.hasFailures) {
    return "Tests failed";
  }

  if (props.build.type === BuildType.Reference) {
    return descriptor.label;
  }

  switch (props.build.status) {
    // The title describes what the build contains (visual changes). The review
    // outcome — approved/rejected/review required — is carried by the colored
    // status line below, so it stays out of the title to avoid redundancy.
    case BuildStatus.ChangesDetected:
    case BuildStatus.Accepted:
    case BuildStatus.Rejected:
      return "Visual changes detected";

    case BuildStatus.NoChanges:
    default:
      return descriptor.label;
  }
}

/**
 * Whether the build still needs a review (visual changes detected and not yet
 * resolved). Excludes builds where reviewing makes no sense: failed builds,
 * orphan/reference builds, or builds with no reviewable diffs.
 */
export function useReviewNeeded(build: Build): boolean {
  const { stats } = useBuildDiffState();
  const hasFailures = Boolean(stats?.failure);
  const reviewableCount = stats
    ? stats.changed + stats.added + stats.removed
    : 0;

  if (hasFailures) {
    return false;
  }

  if (
    build.type &&
    [BuildType.Reference, BuildType.Orphan].includes(build.type)
  ) {
    return false;
  }

  const needsReview = build.status === BuildStatus.ChangesDetected;
  return Boolean(reviewableCount && needsReview);
}

const indicatorDotClassNames = {
  warning: "bg-warning-solid",
  success: "bg-success-solid",
  danger: "bg-danger-solid",
} as const;

function ReviewStatusItem(props: {
  color: keyof typeof indicatorDotClassNames;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={clsx(
          "size-2 shrink-0 rounded-full",
          indicatorDotClassNames[props.color],
        )}
      />
      <div className="text-low text-sm text-balance">{props.children}</div>
    </div>
  );
}

/**
 * Status line under the build title reflecting where the build stands: failed
 * tests block baseline use, review still required, changes approved, or
 * changes rejected. Renders nothing when there's nothing to surface (no
 * changes, orphan/reference builds).
 */
export function ReviewStatusIndicator(props: { build: Build }) {
  const { build } = props;
  const { stats } = useBuildDiffState();
  const hasFailures = Boolean(stats?.failure);
  const reviewNeeded = useReviewNeeded(build);

  // Failed tests make the build unreliable as a baseline. Surface that as a
  // small danger accent here rather than coloring the whole description.
  if (hasFailures && build.type !== BuildType.Orphan) {
    return (
      <ReviewStatusItem color="danger">
        Not reliable as a baseline
      </ReviewStatusItem>
    );
  }

  if (reviewNeeded) {
    return (
      <ReviewStatusItem color="warning">
        Review required before merging
      </ReviewStatusItem>
    );
  }

  // Only comparison builds carry a meaningful approve/reject outcome.
  if (build.type !== BuildType.Check) {
    return null;
  }

  switch (build.status) {
    case BuildStatus.Accepted:
      return (
        <ReviewStatusItem color="success">Changes approved</ReviewStatusItem>
      );

    case BuildStatus.Rejected:
      return (
        <ReviewStatusItem color="danger">Changes rejected</ReviewStatusItem>
      );

    case BuildStatus.NoChanges:
      return (
        <ReviewStatusItem color="success">Nothing to review</ReviewStatusItem>
      );

    default:
      return null;
  }
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
