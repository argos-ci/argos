import { invariant } from "@argos/util/invariant";

const retryableSymbol = Symbol("retryable");

export class UnretryableError extends Error {
  [retryableSymbol] = false;
}

export function unretryable(
  condition: any,
  message?: string,
): asserts condition {
  invariant(condition, message, UnretryableError);
}

export const checkIsRetryable = (error: any): boolean => {
  return error[retryableSymbol] !== false;
};
