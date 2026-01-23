import { parseAsString } from "nuqs";
import { describe, expect, it } from "vitest";

import { checkAreDefaultValues, parseAsSetOf } from "./search-params";

describe("parseAsSetOf", () => {
  it("parses unique values and serializes them", () => {
    const parser = parseAsSetOf(parseAsString);

    const parsed = parser.parse("alpha,beta,alpha");

    expect(parsed).toEqual(new Set(["alpha", "beta"]));
    expect(parser.serialize(new Set(["alpha", "beta"]))).toBe("alpha,beta");
  });

  it("compares sets by membership regardless of order", () => {
    const parser = parseAsSetOf(parseAsString);
    const a = new Set(["alpha", "beta"]);
    const b = new Set(["beta", "alpha"]);
    const c = new Set(["alpha"]);

    expect(parser.eq(a, b)).toBe(true);
    expect(parser.eq(a, c)).toBe(false);
  });

  it("supports custom separators", () => {
    const parser = parseAsSetOf(parseAsString, "|");

    const parsed = parser.parse("x|y");

    expect(parsed).toEqual(new Set(["x", "y"]));
    expect(parser.serialize(new Set(["x", "y"]))).toBe("x|y");
  });
});

describe("checkAreDefaultValues", () => {
  it("returns true when values match defaults", () => {
    const schema = {
      name: parseAsString.withDefault("alice"),
      tag: parseAsString,
    };

    expect(
      checkAreDefaultValues(schema, { name: "alice", tag: null }),
    ).toBe(true);
  });

  it("returns false when a value differs from the default", () => {
    const schema = {
      name: parseAsString.withDefault("alice"),
      tag: parseAsString,
    };

    expect(checkAreDefaultValues(schema, { name: "alice", tag: "x" })).toBe(
      false,
    );
  });

  it("uses the parser eq when comparing defaults", () => {
    const caseInsensitiveParser = {
      parse: (value: string) => value,
      serialize: (value: string) => value,
      eq: (a: string, b: string) => a.toLowerCase() === b.toLowerCase(),
      defaultValue: "FOO",
    };

    const schema = {
      term: caseInsensitiveParser,
    };

    expect(checkAreDefaultValues(schema, { term: "foo" })).toBe(true);
  });
});
