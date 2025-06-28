import type { JSONSchema } from "objection";
import zodToJsonSchemaRaw from "zod-to-json-schema";

/**
 * Converts a Zod schema to a JSON Schema.
 * Re-typed to ensure the return type is JSONSchema.
 */
export function zodToJsonSchema(
  ...args: Parameters<typeof zodToJsonSchemaRaw>
) {
  return zodToJsonSchemaRaw(...args) as JSONSchema;
}
