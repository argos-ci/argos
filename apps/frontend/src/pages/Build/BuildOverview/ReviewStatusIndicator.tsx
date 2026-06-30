import React from "react";
import { clsx } from "clsx";

import { DocumentType, graphql } from "@/gql";
import { BuildStatus, BuildType } from "@/gql/graphql";

import { useBuildDiffState } from "../BuildDiffState";

const _BuildFragment = graphql(`
  fragment ReviewStatusIndicator_Build on Build {
    type
    status
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

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
