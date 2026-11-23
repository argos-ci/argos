import {
  buildSchema,
  getIntrospectionQuery,
  parse,
  specifiedRules,
  validate,
} from "graphql";
import { describe, expect, it } from "vitest";

import { OperationLimitsRule } from "./operation-limits";

const schema = buildSchema(`
  type Node {
    id: ID!
    parent: Node
    child: Node
  }
  type Query {
    node: Node
  }
  type Mutation {
    rename(name: String!): Node
  }
`);

function check(source: string) {
  return validate(schema, parse(source), [
    ...specifiedRules,
    OperationLimitsRule,
  ]).map((error) => error.message);
}

function aliases(count: number) {
  const fields = Array.from({ length: count }, (_, i) => `a${i}: node { id }`);
  return `{ ${fields.join(" ")} }`;
}

/** A query whose deepest field is `depth` levels down. */
function nested(depth: number) {
  return `{ node { ${"child { ".repeat(depth - 2)}id${" }".repeat(depth - 1)} }`;
}

/**
 * Each fragment selects the next one twice, so the selection doubles with
 * every fragment while the document stays small.
 */
function fanOut(fragments: number, select: (next: string) => string) {
  const definitions = Array.from({ length: fragments }, (_, i) =>
    i === fragments - 1
      ? `fragment F${i} on Node { ${select("")} }`
      : `fragment F${i} on Node { ${select(`F${i + 1}`)} }`,
  );
  return `{ node { ...F0 } } ${definitions.join(" ")}`;
}

const underTwoFields = (next: string) =>
  next ? `parent { ...${next} } child { ...${next} }` : "id";

describe("OperationLimitsRule", () => {
  it.each([
    ["30 aliases", aliases(30)],
    ["depth 15", nested(15)],
    ["3,071 fields from fragments", fanOut(11, underTwoFields)],
    ["one mutation", `mutation { rename(name: "a") { id } }`],
    [
      "one mutation next to __typename",
      `mutation { __typename rename(name: "a") { id } }`,
    ],
    [
      "the introspection query",
      getIntrospectionQuery({
        descriptions: true,
        specifiedByUrl: true,
        directiveIsRepeatable: true,
        schemaDescription: true,
        inputValueDeprecation: true,
        oneOf: true,
      }),
    ],
  ])("accepts %s", (_label, source) => {
    expect(check(source)).toEqual([]);
  });

  it.each([
    [
      "31 aliases",
      aliases(31),
      "This operation has more than 30 aliases. Split it into smaller operations.",
    ],
    [
      "depth 16",
      nested(16),
      "This operation is nested more than 15 levels deep. Request fewer nested fields.",
    ],
    [
      "12,287 fields from fragments",
      fanOut(13, underTwoFields),
      "This operation selects more than 5,000 fields, counting each use of a fragment. Split it into smaller operations.",
    ],
    [
      "two mutations",
      `mutation { a: rename(name: "a") { id } b: rename(name: "b") { id } }`,
      "This operation has more than one mutation. Send each mutation in its own request.",
    ],
    [
      "two mutations from a fragment",
      `mutation { ...Renames } fragment Renames on Mutation { a: rename(name: "a") { id } b: rename(name: "b") { id } }`,
      "This operation has more than one mutation. Send each mutation in its own request.",
    ],
  ])("refuses %s", (_label, source, message) => {
    expect(check(source)).toEqual([message]);
  });

  it.each([
    [
      "a cyclic fragment",
      `{ node { ...A } } fragment A on Node { child { ...A } }`,
      'Cannot spread fragment "A" within itself.',
    ],
    [
      "fragments that fan out into an unknown one",
      fanOut(30, (next) => (next ? `...${next} ...${next}` : "...Missing")),
      'Unknown fragment "Missing".',
    ],
  ])("leaves %s to graphql's own rules", (_label, source, message) => {
    expect(check(source)).toEqual([message]);
  });
});
