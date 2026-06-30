import React from "react";
import { assertNever } from "@argos/util/assertNever";
import { clsx } from "clsx";

import { DocumentType, graphql } from "@/gql";
import { BuildStatus, BuildType } from "@/gql/graphql";

import { bgSolidColorClassNames, UIColor } from "../../../util/colors";
import { useBuildDiffState } from "../BuildDiffState";

const _BuildFragment = graphql(`
  fragment ReviewStatusIndicator_Build on Build {
    type
    status
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

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

function ReviewStatusItem(props: {
  color: UIColor;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={clsx(
          "size-2 shrink-0 rounded-full",
          bgSolidColorClassNames[props.color],
        )}
      />
      <div className="text-low text-sm text-balance">{props.children}</div>
    </div>
  );
}

export function ReviewStatusIndicator(props: { build: Build }) {
  const { build } = props;
  const { stats } = useBuildDiffState();
  const hasFailures = Boolean(stats?.failure);
  const reviewNeeded = useReviewNeeded(build);

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

  if (build.type !== BuildType.Check) {
    return null;
  }

  switch (build.status) {
    case BuildStatus.Accepted:
      return (
        <ReviewStatusItem color="success">Changes approved</ReviewStatusItem>
      );

    case BuildStatus.Rejected:
    case BuildStatus.Aborted:
      return (
        <ReviewStatusItem color="danger">Changes rejected</ReviewStatusItem>
      );

    case BuildStatus.NoChanges:
      return (
        <ReviewStatusItem color="success">Nothing to review</ReviewStatusItem>
      );

    case BuildStatus.ChangesDetected:
      throw new Error(
        "Changes detected should be handled by the `reviewNeeded` check above, and should not be displayed in this component.",
      );

    case BuildStatus.Error:
    case BuildStatus.Expired:
      return (
        <ReviewStatusItem color="danger">
          Not reliable as a baseline
        </ReviewStatusItem>
      );

    case BuildStatus.Pending:
    case BuildStatus.Progress:
      return null;

    default:
      assertNever(build.status);
  }
}
