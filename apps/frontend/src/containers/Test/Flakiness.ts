/**
 * Get the UIColor based on the flakiness value.
 */
export function getFlakinessColor(value: number): string {
  if (value < 0.35) {
    return "var(--background-color-success-solid)";
  } else if (value < 0.5) {
    return "var(--background-color-warning-solid)";
  } else {
    return "var(--background-color-danger-solid)";
  }
}
