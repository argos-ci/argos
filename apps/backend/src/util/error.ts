import { STATUS_CODES } from "node:http";
import type { ErrorCode } from "@argos/error-types";

export const retryableSymbol = Symbol("retryable");

const HTTP2_GOAWAY_CODE_0_MESSAGE =
  'HTTP/2: "GOAWAY" frame received with code 0';

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

export function isHttp2GoAwayCode0Error(error: unknown): boolean {
  return hasHttp2GoAwayCode0Error(error, new Set());
}

function hasHttp2GoAwayCode0Error(error: unknown, seen: Set<unknown>): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  if (seen.has(error)) {
    return false;
  }
  seen.add(error);

  if (error.message.includes(HTTP2_GOAWAY_CODE_0_MESSAGE)) {
    return true;
  }

  if ("cause" in error && hasHttp2GoAwayCode0Error(error.cause, seen)) {
    return true;
  }

  if ("errors" in error && Array.isArray(error.errors)) {
    return error.errors.some((child) => hasHttp2GoAwayCode0Error(child, seen));
  }

  return false;
}
