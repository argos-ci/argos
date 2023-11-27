export function assertUnreachable(
  _x: never,
  message = "unreachable code reached",
): never {
  throw new Error(message);
}
