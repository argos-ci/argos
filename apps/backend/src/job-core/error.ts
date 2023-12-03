import { invariant } from "@/util/invariant.js";

const retryableSymbol = Symbol("retryable");

export class UnretryableError extends Error {
  [retryableSymbol] = false;
}

export function unretryable(
  condition: any,
  message?: string,
): asserts condition {
  // @ts-ignore
  invariant(condition, message, UnretryableError);
}

export const checkIsRetryable = (error: any): boolean => {
  return error[retryableSymbol] !== false;
};
