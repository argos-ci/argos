import { describe, expect, it } from "vitest";

import { schema } from "./schema";

const METHODS = ["get", "post", "put", "patch", "delete"] as const;

function getOperationTags(): Set<string> {
  const tags = new Set<string>();
  const pathItems = [
    ...Object.values(schema.paths ?? {}),
    ...Object.values(schema.webhooks ?? {}),
  ];
  for (const pathItem of pathItems) {
    for (const method of METHODS) {
      for (const tag of pathItem[method]?.tags ?? []) {
        tags.add(tag);
      }
    }
  }
  return tags;
}

describe("OpenAPI tags", () => {
  const declared = schema.tags ?? [];
  const names = new Set(declared.map((tag) => tag.name));
  const parents = new Set(
    declared.flatMap((tag) => (tag.parent ? [tag.parent] : [])),
  );
  const used = getOperationTags();

  it("declares every tag an operation or a webhook uses", () => {
    expect([...used].filter((tag) => !names.has(tag))).toEqual([]);
  });

  it("nests tags only under declared groups that hold no operation", () => {
    expect(
      [...parents].filter((parent) => !names.has(parent) || used.has(parent)),
    ).toEqual([]);
  });
});
