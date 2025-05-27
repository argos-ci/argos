import type { Handler } from "../workflow-types";
import * as foo from "./foo";
import * as spend_limit from "./spend_limit";

const handlers = [foo.handler, spend_limit.handler] satisfies Handler<
  string,
  any
>[];

export type HandlersType = (typeof handlers)[number];
export type HandlersName = HandlersType["name"];

export function getHandler<T extends HandlersName>(
  name: T,
): Extract<HandlersType, { name: T }> {
  const handler = handlers.find((h) => h.name === name);
  if (!handler) {
    throw new Error(`Handler not found: ${name}`);
  }
  return handler as Extract<HandlersType, { name: T }>;
}
