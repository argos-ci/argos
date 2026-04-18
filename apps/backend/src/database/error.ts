/**
 * Check whether an unknown database error is a Postgres unique-constraint violation.
 */
export function isUniqueViolationError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const pgError = error as {
    code?: string;
    nativeError?: { code?: string };
  };

  return pgError.code === "23505" || pgError.nativeError?.code === "23505";
}
