import { MutationHookOptions, useMutation } from "@apollo/client";

import { graphql } from "@/gql";
import {
  BuildReviewAction_SetValidationStatusMutation,
  BuildStatus,
  Exact,
  ValidationStatus,
} from "@/gql/graphql";

const SetValidationStatusMutation = graphql(`
  mutation BuildReviewAction_setValidationStatus(
    $buildId: ID!
    $validationStatus: ValidationStatus!
  ) {
    setValidationStatus(
      buildId: $buildId
      validationStatus: $validationStatus
    ) {
      id
      status
      # Invalidate the cache for the build status chip
      ...BuildStatusChip_Build
    }
  }
`);

export function useSetValidationStatusMutation(
  options?: MutationHookOptions<
    BuildReviewAction_SetValidationStatusMutation,
    Exact<{
      buildId: string;
      validationStatus: ValidationStatus;
    }>
  >,
) {
  return useMutation(SetValidationStatusMutation, {
    optimisticResponse: (variables) => ({
      setValidationStatus: {
        id: variables.buildId,
        status:
          variables.validationStatus === ValidationStatus.Accepted
            ? BuildStatus.Accepted
            : variables.validationStatus === ValidationStatus.Rejected
              ? BuildStatus.Rejected
              : BuildStatus.Pending,
      },
    }),
    ...options,
  });
}
