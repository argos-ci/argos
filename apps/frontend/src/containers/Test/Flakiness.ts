/**
 * Get the UIColor based on the flakiness value.
 */
export function getFlakinessColor(value: number): string {
  if (value < 0.35) {
    return "var(--grass-10)";
  } else if (value < 0.5) {
    return "var(--orange-10)";
  } else {
    return "var(--tomato-10)";
  }
}
