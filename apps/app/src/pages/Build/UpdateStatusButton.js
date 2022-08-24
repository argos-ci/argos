import React from "react";
import { Button } from "@argos-ci/app/src/components";
import { gql, useMutation } from "@apollo/client";
import { statusText } from "../../containers/Status";

export const UpdateStatusButtonFragment = gql`
  fragment UpdateStatusButtonFragment on Build {
    id
    status
  }
`;

function getNextStatus(status) {
  if (status === "success") return "failure";
  if (status === "failure") return "success";
  return null;
}

export function UpdateStatusButton({ build: { id, status } }) {
  const nextStatus = getNextStatus(status);
  const nextStatusText = statusText(nextStatus);

  const [setValidationStatus, { loading }] = useMutation(gql`
    mutation setValidationStatus(
      $buildId: ID!
      $validationStatus: ValidationStatus!
    ) {
      setValidationStatus(
        buildId: $buildId
        validationStatus: $validationStatus
      )
    }
  `);

  if (!nextStatus) return null;

  return (
    <Button
      disabled={loading}
      variant="primary"
      py={2}
      onClick={() =>
        setValidationStatus({
          variables: {
            buildId: id,
            validationStatus: nextStatusText,
          },
        })
      }
    >
      Review changes
    </Button>
  );
}
