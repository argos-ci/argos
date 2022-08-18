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
