import React from "react";
import { x } from "@xstyled/styled-components";
import { FaTimes, FaCheck, FaDotCircle } from "react-icons/fa";
import { getVariantColor } from "../modules/utils";

export function StatusIcon({ status, ...props }) {
  const buildColor = getVariantColor(status);
  switch (status) {
    case "failure":
    case "error":
    case "aborted":
      return <x.svg as={FaTimes} color={buildColor} {...props} />;
    case "success":
    case "complete":
      return <x.svg as={FaCheck} color={buildColor} {...props} />;
    case "pending":
      return <x.svg as={FaDotCircle} color={buildColor} {...props} />;
    case "neutral":
      return <x.svg as={FaDotCircle} color={buildColor} {...props} />;
    default:
      return null;
  }
}
