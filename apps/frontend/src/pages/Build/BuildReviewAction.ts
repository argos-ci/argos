import { useMutation } from "@apollo/client/react";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import { DocumentType, graphql } from "@/gql";
import {
  BuildStatus,
  ReviewState,
  ScreenshotDiffReviewState,
  type BuildReviewAction_ReviewBuildMutation,
  type BuildReviewAction_ReviewBuildMutationVariables,
} from "@/gql/graphql";
import { useEventCallback } from "@/ui/useEventCallback";

import {
  useBuildReviewAPI,
  useGetReviewedDiffStatuses,
} from "./BuildReviewState";
import { EvaluationStatus } from "./EvaluationStatus";

const ReviewBuildMutation = graphql(`
  mutation BuildReviewAction_reviewBuild($input: ReviewBuildInput!) {
    reviewBuild(input: $input) {
      id
      status
      ...BuildReviewAction_Build
    }
  }
`);

const _BuildFragment = graphql(`
  fragment BuildReviewAction_Build on Build {
    id
    # Invalidate the cache for the build status chip
    ...BuildStatusChip_Build
  }
`);

export function useReviewBuildMutation(
  build: DocumentType<typeof _BuildFragment>,
  options?: Pick<
    useMutation.Options<
      BuildReviewAction_ReviewBuildMutation,
      BuildReviewAction_ReviewBuildMutationVariables
    >,
    "onCompleted"
  >,
) {
  const api = useBuildReviewAPI();
  const [mutate, data] = useMutation(ReviewBuildMutation, {
    optimisticResponse: (vars, { IGNORE }) => {
      const status = getOptimisticBuildStatus(vars.input.state);
      if (!status) {
        return IGNORE;
      }
      return {
        reviewBuild: {
          ...build,
          status,
        },
      };
    },
    ...options,
  });

  const getReviewedDiffStatuses = useGetReviewedDiffStatuses();
  const reviewBuild = useEventCallback(async (reviewState: ReviewState) => {
    invariant(api, `Reviewing a build requires api to be defined`);
    const diffStatuses = getReviewedDiffStatuses(reviewState);
    const screenshotDiffReviews = Object.entries(diffStatuses)
      .map(([diffId, status]) => {
        const diffState = evaluationStatusToReviewState(
          getDiffEvaluationStatus(reviewState, status),
        );

        if (!diffState) {
          return null;
        }

        return {
          screenshotDiffId: diffId,
          state: diffState,
        };
      })
      .filter((x) => x !== null);
    const result = await mutate({
      variables: {
        input: {
          buildId: build.id,
          state: reviewState,
          screenshotDiffReviews,
        },
      },
    });
    api.setDiffStatuses(diffStatuses);
    return result;
  });

  return [reviewBuild, data] as const;
}

/**
 * Get the default diff evaluation status from the
 */
function getDiffEvaluationStatus(
  reviewState: ReviewState,
  diffStatus: EvaluationStatus | undefined,
): EvaluationStatus {
  diffStatus = diffStatus ?? EvaluationStatus.Pending;

  if (reviewState === ReviewState.Approved) {
    if (diffStatus === EvaluationStatus.Pending) {
      return EvaluationStatus.Accepted;
    }
  }
  return diffStatus;
}

function evaluationStatusToReviewState(
  status: EvaluationStatus,
): ScreenshotDiffReviewState | null {
  switch (status) {
    case EvaluationStatus.Accepted:
      return ScreenshotDiffReviewState.Approved;
    case EvaluationStatus.Rejected:
      return ScreenshotDiffReviewState.Rejected;
    case EvaluationStatus.Pending:
      return null;
    default:
      assertNever(status);
  }
}

function getOptimisticBuildStatus(state: ReviewState): BuildStatus | undefined {
  switch (state) {
    case ReviewState.Approved:
      return BuildStatus.Accepted;
    case ReviewState.Rejected:
      return BuildStatus.Rejected;
    case ReviewState.Commented:
    case ReviewState.Dismissed:
    case ReviewState.Pending:
      return undefined;
    default:
      assertNever(state);
  }
}
