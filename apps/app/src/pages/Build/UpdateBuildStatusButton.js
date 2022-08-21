import React from "react";
import { Button } from "@argos-ci/app/src/components";
import { StatusIcon, statusText } from "../../containers/StatusIcon";
import { gql, useMutation } from "@apollo/client";
import { BuildContextFragment } from ".";

function getNextStatus(status) {
  if (status === "success") return "failure";
  if (status === "failure") return "success";
  return null;
}

export function UpdateBuildStatusButton({ build }) {
  const nextStatus = getNextStatus(build.status);
  const nextStatusText = statusText(nextStatus);

  const [setValidationStatus, { loading }] = useMutation(gql`
    mutation setValidationStatus(
      $buildId: ID!
      $validationStatus: ValidationStatus!
    ) {
      setValidationStatus(
        buildId: $buildId
        validationStatus: $validationStatus
      ) {
        ...BuildContextFragment
      }
    }
    ${BuildContextFragment}
  `);

  if (!nextStatus) return null;

  return (
    <Button
      disabled={loading}
      variant={nextStatus}
      py={2}
      onClick={() =>
        setValidationStatus({
          variables: { buildId: build.id, validationStatus: nextStatusText },
        })
      }
    >
      <StatusIcon status={nextStatus} mt="1px" />
      Mark as {nextStatusText}
    </Button>
  );
}
