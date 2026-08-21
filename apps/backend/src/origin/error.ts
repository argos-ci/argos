/**
 * An error response from the Origin API.
 *
 * Origin answers errors with a Google RPC-style body (`code`, `message`,
 * `details`); the HTTP status is what callers branch on.
 */
export class OriginApiError extends Error {
  status: number;
  code: number | null;
  path: string;

  constructor(input: {
    status: number;
    code: number | null;
    message: string;
    path: string;
  }) {
    super(`Origin API ${input.status} on ${input.path}: ${input.message}`);
    this.name = "OriginApiError";
    this.status = input.status;
    this.code = input.code;
    this.path = input.path;
  }
}

/**
 * Check if an error is an Origin API error with the given HTTP status.
 */
export function checkOriginErrorStatus(
  status: number,
  error: unknown,
): error is OriginApiError {
  return error instanceof OriginApiError && error.status === status;
}
