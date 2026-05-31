import { useMutation } from "@apollo/client/react";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import { DocumentType, graphql } from "@/gql";
import {
  BuildReviewEvent,
  ScreenshotDiffReviewState,
  type BuildReviewAction_CreateBuildReviewMutation,
  type BuildReviewAction_CreateBuildReviewMutationVariables,
} from "@/gql/graphql";
import { EditorValue } from "@/ui/Editor/Editor";
import { useEventCallback } from "@/ui/useEventCallback";

import {
  useBuildReviewAPI,
  useGetReviewedDiffStatuses,
} from "./BuildReviewState";
import { EvaluationStatus } from "./EvaluationStatus";

const CreateBuildReviewMutation = graphql(`
  mutation BuildReviewAction_createBuildReview(
    $input: CreateBuildReviewInput!
  ) {
    createBuildReview(input: $input) {
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
    # Ensure the comment added by the review (if any) lands in the cache,
    # so it appears in the review activity section.
    comments {
      ...CommentCard_Comment
    }
  }
`);

export function useCreateBuildReviewMutation(
  build: DocumentType<typeof _BuildFragment>,
  options?: Pick<
    useMutation.Options<
      BuildReviewAction_CreateBuildReviewMutation,
      BuildReviewAction_CreateBuildReviewMutationVariables
    >,
    "onCompleted"
  >,
) {
  const api = useBuildReviewAPI();
  const [mutate, data] = useMutation(CreateBuildReviewMutation, {
    ...options,
  });

  const getReviewedDiffStatuses = useGetReviewedDiffStatuses();
  const createReview = useEventCallback(
    async (input: { event: BuildReviewEvent; body?: EditorValue }) => {
      invariant(api, `Reviewing a build requires api to be defined`);
      const diffStatuses = getReviewedDiffStatuses(input.event);
      const screenshotDiffReviews = Object.entries(diffStatuses)
        .map(([diffId, status]) => {
          const diffState = evaluationStatusToReviewState(
            getDiffEvaluationStatus(input.event, status),
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
            event: input.event,
            body: input.body ?? null,
            screenshotDiffReviews,
          },
        },
      });
      api.setDiffStatuses(diffStatuses);
      return result;
    },
  );

  return [createReview, data] as const;
}

/**
 * Get the default diff evaluation status from the review event.
 */
function getDiffEvaluationStatus(
  event: BuildReviewEvent,
  diffStatus: EvaluationStatus | undefined,
): EvaluationStatus {
  diffStatus = diffStatus ?? EvaluationStatus.Pending;

  if (event === BuildReviewEvent.Approve) {
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
