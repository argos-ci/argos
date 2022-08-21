import React from "react";
import { FaTimes, FaCheck, FaDotCircle } from "react-icons/fa";
import { getVariantColor } from "../modules/utils";
import { Icon } from "../components";

export function StatusIcon({ status, ...props }) {
  const buildColor = getVariantColor(status);
  switch (status) {
    case "failure":
    case "error":
    case "aborted":
      return <Icon as={FaTimes} color={buildColor} {...props} />;
    case "success":
    case "complete":
      return <Icon as={FaCheck} color={buildColor} {...props} />;
    case "pending":
      return <Icon as={FaDotCircle} color={buildColor} {...props} />;
    case "neutral":
      return <Icon as={FaDotCircle} color={buildColor} {...props} />;
    default:
      return null;
  }
}

export function statusText(status) {
  switch (status) {
    case "failure":
    case "error":
    case "aborted":
      return "rejected";
    case "success":
    case "complete":
      return "approved";
    case "pending":
      return "In Progress";
    default:
      return null;
  }
}
