const invariantPrefix = "Invariant failed";

/**
 * An invariant function takes a value, and if the value is falsy
 * then the invariant function will throw.
 * If the value is truthy, then the function will not throw.
 */
export function invariant<T>(
  condition: T,
  // Can provide a string, or a function that returns a string for cases where
  // the message takes a fair amount of effort to compute
  message?: string | (() => string),
  errorConstructor: new (message: string) => Error = Error,
): asserts condition {
  if (condition) {
    return;
  }
  // Condition not passed
  const provided: string | undefined =
    typeof message === "function" ? message() : message;

  // Options:
  // 1. message provided: `${prefix}: ${provided}`
  // 2. message not provided: prefix
  const value: string = provided
    ? `${invariantPrefix}: ${provided}`
    : invariantPrefix;

  throw new errorConstructor(value);
}
