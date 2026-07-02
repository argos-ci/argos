import { useIsLoggedIn } from "@/containers/Auth";
import { useProjectPermission } from "@/containers/Project/PermissionsContext";
import { DocumentType, graphql } from "@/gql";
import { BuildType, ProjectPermission } from "@/gql/graphql";

import {
  useBuildReviewProgression,
  type BuildReviewProgression,
} from "./ReviewProgressBadge";

const _BuildFragment = graphql(`
  fragment BuildReviewability_Build on Build {
    type
    mergeQueue
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

/**
 * Why a build's changes can or can't be reviewed, independent of who is
 * looking. Mirrors the gating of the review button in the build header.
 */
export type BuildReviewability =
  | { reviewable: true; progression: BuildReviewProgression }
  | {
      reviewable: false;
      reason: "merge-queue" | "reference" | "loading" | "no-changes";
    };

/**
 * Whether this build is in a state where its changes can be reviewed, and why
 * not otherwise. Shared by the header review button and the build overview so
 * they stay in agreement.
 */
export function useBuildReviewability(build: Build): BuildReviewability {
  const progression = useBuildReviewProgression();
  if (build.mergeQueue) {
    return { reviewable: false, reason: "merge-queue" };
  }
  if (build.type === BuildType.Reference) {
    return { reviewable: false, reason: "reference" };
  }
  if (!progression) {
    return { reviewable: false, reason: "loading" };
  }
  if (progression.toReview.length === 0) {
    return { reviewable: false, reason: "no-changes" };
  }
  return { reviewable: true, progression };
}

/**
 * Whether the current viewer can review this build: they're signed in, hold
 * review rights, and the build itself is reviewable. Matches the conditions
 * under which the header shows an enabled review button.
 */
export function useCanReviewBuild(build: Build): boolean {
  const loggedIn = useIsLoggedIn();
  const hasReviewPermission = useProjectPermission(ProjectPermission.Review);
  const reviewability = useBuildReviewability(build);
  return loggedIn && hasReviewPermission && reviewability.reviewable;
}
