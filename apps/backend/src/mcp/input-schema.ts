import { isRecord } from "@argos/util/isRecord";

type JsonSchema = Record<string, unknown>;

const DEFS_REF_PREFIX = "#/$defs/";

/**
 * Give every argument of a tool's input JSON Schema a `type`.
 *
 * Zod writes a schema registered with a component id (`BuildNumber`,
 * `TestId`…) as a `$ref` into `$defs`, and a union (a nullable field,
 * Markdown or rich text) as a bare `anyOf`. Both are valid JSON Schema, but
 * the Claude connectors directory flags an argument without a `type`. A
 * top-level `$ref` is inlined and a union gets the types of its branches.
 * Nested references stay, since `$defs` is kept.
 */
export function typeEveryArgument(schema: JsonSchema): JsonSchema {
  const defs = isRecord(schema["$defs"]) ? schema["$defs"] : {};
  const properties = schema["properties"];
  if (!isRecord(properties)) {
    return schema;
  }
  return {
    ...schema,
    properties: Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [
        key,
        isRecord(value) ? typeArgument(value, defs) : value,
      ]),
    ),
  };
}

function typeArgument(node: JsonSchema, defs: JsonSchema): JsonSchema {
  const inlined = inlineRef(node, defs, new Set());
  if (inlined["type"] !== undefined) {
    return inlined;
  }
  const types = collectTypes(inlined, defs, new Set());
  if (!types || types.size === 0) {
    return inlined;
  }
  const [first, ...rest] = types;
  return { type: rest.length === 0 ? first : [...types], ...inlined };
}

function inlineRef(
  node: JsonSchema,
  defs: JsonSchema,
  seen: Set<string>,
): JsonSchema {
  const ref = node["$ref"];
  if (typeof ref !== "string" || !ref.startsWith(DEFS_REF_PREFIX)) {
    return node;
  }
  const name = ref.slice(DEFS_REF_PREFIX.length);
  const target = defs[name];
  if (seen.has(name) || !isRecord(target)) {
    return node;
  }
  const { $ref: _ref, ...rest } = node;
  return { ...inlineRef(target, defs, new Set(seen).add(name)), ...rest };
}

/** The JSON types a schema accepts, or `null` when they cannot be told. */
function collectTypes(
  node: unknown,
  defs: JsonSchema,
  seen: Set<string>,
): Set<string> | null {
  if (!isRecord(node)) {
    return null;
  }
  const ref = node["$ref"];
  if (typeof ref === "string") {
    const name = ref.slice(DEFS_REF_PREFIX.length);
    if (!ref.startsWith(DEFS_REF_PREFIX) || seen.has(name)) {
      return null;
    }
    return collectTypes(defs[name], defs, new Set(seen).add(name));
  }
  const { type } = node;
  if (typeof type === "string") {
    return new Set([type]);
  }
  if (Array.isArray(type)) {
    return new Set(type.filter((item) => typeof item === "string"));
  }
  if ("const" in node) {
    return new Set([jsonTypeOf(node["const"])]);
  }
  if (Array.isArray(node["enum"])) {
    return new Set(node["enum"].map(jsonTypeOf));
  }
  const branches = node["anyOf"] ?? node["oneOf"];
  if (Array.isArray(branches)) {
    const types = new Set<string>();
    for (const branch of branches) {
      const branchTypes = collectTypes(branch, defs, seen);
      if (!branchTypes) {
        return null;
      }
      branchTypes.forEach((item) => types.add(item));
    }
    return types;
  }
  const allOf = node["allOf"];
  if (Array.isArray(allOf) && allOf.length === 1) {
    return collectTypes(allOf[0], defs, seen);
  }
  return null;
}

function jsonTypeOf(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? "integer" : "number";
  }
  return typeof value;
}
