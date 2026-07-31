import type { UIColor } from "@/util/colors";

export function getFlakinessUIColor(value: number) {
  if (value < 0.35) {
    return "success" satisfies UIColor;
  } else if (value < 0.5) {
    return "warning" satisfies UIColor;
  } else {
    return "danger" satisfies UIColor;
  }
}

/**
 * Whether a flakiness score is worth acting on. Derived from the gauge's colors
 * so "flaky" means exactly what the page already shows: anything the gauge does
 * not paint green.
 */
export function isFlaky(value: number): boolean {
  return getFlakinessUIColor(value) !== "success";
}
