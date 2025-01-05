import { MutationHookOptions, useMutation } from "@apollo/client";

import { DocumentType, graphql } from "@/gql";
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

const _BuildFragment = graphql(`
  fragment BuildReviewAction_Build on Build {
    id
    # Invalidate the cache for the build status chip
    ...BuildStatusChip_Build
  }
`);

export function useSetValidationStatusMutation(
  build: DocumentType<typeof _BuildFragment>,
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
        ...build,
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
