export function getVariantColor(status) {
  switch (status) {
    case "primary":
      return "primary";

    case "success":
      return "green";

    case "danger":
    case "failure":
    case "error":
      return "red";

    case "neutral":
      return "gray";

    case "pending":
    default:
      return "orange";
  }
}

export const getPossessiveForm = (str) =>
  str.charAt(str.length - 1) === "s" ? `${str}’ ` : `${str}’s`;
