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
