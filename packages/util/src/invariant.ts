const invariantPrefix = "Invariant failed";

/**
 * True when no value of T is falsy: objects, functions, symbols and `true`.
 * `any`, `unknown` and `never` are left out, as are wide primitives
 * (`string` can be "", `number` can be 0).
 */
type IsNeverFalsy<T> = 0 extends 1 & T
  ? false
  : unknown extends T
    ? false
    : [T] extends [never]
      ? false
      : [T] extends [object | symbol | true]
        ? true
        : false;

type InvariantArgs<T> =
  IsNeverFalsy<T> extends true
    ? [
        error: "This value is never falsy, its type already guarantees it. Remove the invariant.",
      ]
    : [
        // Can provide a string, or a function that returns a string for cases
        // where the message takes a fair amount of effort to compute
        message?: string | (() => string),
        errorConstructor?: new (message: string) => Error,
      ];

/**
 * An invariant function takes a value, and if the value is falsy
 * then the invariant function will throw.
 * If the value is truthy, then the function will not throw.
 *
 * Passing a value whose type can never be falsy is a type error: the check
 * could never fail, so it only hides that the type is already right. The
 * check can't be resolved on a generic type (`TDef[keyof TDef]`) and rejects
 * it too: annotate the value with its concrete type first.
 */
export function invariant<T>(
  condition: T,
  ...args: InvariantArgs<T>
): asserts condition;
export function invariant(
  condition: unknown,
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
