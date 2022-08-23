import React from "react";
import { FaDotCircle } from "react-icons/fa";
import { getVariantColor } from "../modules/utils";
import { Icon, Tag } from "../components";
import { GoCheck, GoX } from "react-icons/go";

export function StatusIcon({ status, ...props }) {
  const buildColor = getVariantColor(status);
  switch (status) {
    case "failure":
    case "error":
    case "aborted":
      return <Icon as={GoX} color={buildColor} {...props} />;
    case "success":
    case "complete":
      return <Icon as={GoCheck} color={buildColor} {...props} />;
    case "pending":
      return <Icon as={FaDotCircle} color={buildColor} {...props} />;
    case "neutral":
      return <Icon as={FaDotCircle} color={buildColor} {...props} />;
    default:
      return null;
  }
}

export function StatusTag({ status, children, ...props }) {
  return (
    <Tag
      display="flex"
      textAlign="center"
      gap={1}
      borderColor={getVariantColor(status)}
      {...props}
    >
      <StatusIcon status={status} mt={1} />
      {children}
    </Tag>
  );
}

export function statusText(status) {
  switch (status) {
    case "failure":
    case "error":
    case "aborted":
      return "Changes Requested";
    case "success":
    case "complete":
      return "Review Approved";
    case "pending":
      return "Build In Progress";
    case "unknown":
      return "Differences detected";
    default:
      return null;
  }
}
