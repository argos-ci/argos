import { invariant } from "@argos/util/invariant";

import { retryableSymbol } from "@/util/error";

export class UnretryableError extends Error {
  [retryableSymbol] = false;
}

export function unretryable(
  condition: any,
  message?: string,
): asserts condition {
  invariant(condition, message, UnretryableError);
}
