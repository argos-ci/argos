import React from "react";
import { Button } from "@argos-ci/app/src/components";
import { FaCheck, FaTimes } from "react-icons/fa";
import { useValidationStatusBuild } from "./Context";

export default function BuildDetailAction({ build }) {
  const { setValidationStatus, loading } = useValidationStatusBuild();
  let actionMessage;
  let variant;
  let validationStatus;

  switch (build.status) {
    case "success":
      actionMessage = (
        <>
          <FaTimes style={{ fontSize: "0.8em" }} /> Mark as rejected
        </>
      );
      variant = "danger";
      validationStatus = "rejected";
      break;
    case "failure":
      actionMessage = (
        <>
          <FaCheck style={{ fontSize: "0.8em" }} /> Mark as approved
        </>
      );
      variant = "success";
      validationStatus = "accepted";
      break;
    default:
      return null;
  }

  return (
    <Button
      disabled={loading}
      variant={variant}
      onClick={() =>
        setValidationStatus({
          variables: {
            buildId: build.id,
            validationStatus,
          },
        })
      }
    >
      {actionMessage}
    </Button>
  );
}
