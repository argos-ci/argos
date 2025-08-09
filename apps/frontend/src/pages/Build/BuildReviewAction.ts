import { MutationHookOptions, useMutation } from "@apollo/client";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import { DocumentType, graphql } from "@/gql";
import {
  BuildStatus,
  ReviewState,
  type BuildReviewAction_ReviewBuildMutation,
  type BuildReviewAction_ReviewBuildMutationVariables,
  type ScreenshotDiffReviewInput,
} from "@/gql/graphql";
import { useEventCallback } from "@/ui/useEventCallback";

import { EvaluationStatus, useGetReviewDiffStatuses } from "./BuildReviewState";

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
    MutationHookOptions<
      BuildReviewAction_ReviewBuildMutation,
      BuildReviewAction_ReviewBuildMutationVariables
    >,
    "onCompleted"
  >,
) {
  const getReviewDiffStatuses = useGetReviewDiffStatuses();
  const [mutate, data] = useMutation(ReviewBuildMutation, {
    optimisticResponse: (vars) => {
      return {
        reviewBuild: {
          ...build,
          status: {
            [ReviewState.Approved]: BuildStatus.Accepted,
            [ReviewState.Rejected]: BuildStatus.Rejected,
          }[vars.input.state],
        },
      };
    },
    ...options,
  });

  const reviewBuild = useEventCallback(async (state: ReviewState) => {
    invariant(
      getReviewDiffStatuses,
      `Reviewing a build requires getReviewDiffStatuses to be defined`,
    );
    const screenshotDiffReviews: ScreenshotDiffReviewInput[] = Object.entries(
      getReviewDiffStatuses(),
    )
      .map(([screenshotDiffId, status]) => {
        const state = evaluationStatusToReviewState(status);
        if (!state) {
          return null;
        }
        return { screenshotDiffId, state };
      })
      .filter((x) => x !== null);
    const result = await mutate({
      variables: {
        input: {
          buildId: build.id,
          state,
          screenshotDiffReviews,
        },
      },
    });
    return result;
  });

  return [reviewBuild, data] as const;
}

function evaluationStatusToReviewState(
  status: EvaluationStatus,
): ReviewState | null {
  switch (status) {
    case EvaluationStatus.Accepted:
      return ReviewState.Approved;
    case EvaluationStatus.Rejected:
      return ReviewState.Rejected;
    case EvaluationStatus.Pending:
      return null;
    default:
      assertNever(status);
  }
}
