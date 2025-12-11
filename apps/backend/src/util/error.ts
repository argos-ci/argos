import { STATUS_CODES } from "node:http";
import type { ErrorCode } from "@argos/error-types";

export const retryableSymbol = Symbol("retryable");

/**
 * Check if an error is retryable.
 */
export function checkIsRetryable(error: unknown): boolean {
  if (error && typeof error === "object" && retryableSymbol in error) {
    return error[retryableSymbol] !== false;
  }
  return true;
}

type HttpErrorOptions = ErrorOptions & {
  details?: {
    message: string;
  }[];
  code?: ErrorCode | undefined;
  retryable?: boolean;
};

/**
 * HTTPError is a subclass of Error that includes an HTTP status code.
 */
export class HTTPError extends Error {
  public statusCode: number;
  public code: ErrorCode | null;
  public details:
    | {
        message: string;
      }[]
    | undefined;
  public [retryableSymbol]: boolean;

  constructor(
    statusCode: number,
    message?: string,
    options?: HttpErrorOptions,
  ) {
    super(message || STATUS_CODES[statusCode], options);
    this.statusCode = statusCode;
    this.details = options?.details;
    this.code = options?.code || null;
    this[retryableSymbol] = options?.retryable ?? true;
  }
}

export function boom(
  statusCode: number,
  message?: string,
  options?: HttpErrorOptions,
) {
  return new HTTPError(statusCode, message, options);
}
