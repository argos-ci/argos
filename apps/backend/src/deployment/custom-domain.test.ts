import { describe, expect, it } from "vitest";

import { validateCustomDomain } from "./custom-domain";

describe("validateCustomDomain", () => {
  it.each([
    ["docs.example.com", "docs.example.com"],
    ["example.com", "example.com"],
    ["  Docs.Example.COM  ", "docs.example.com"],
    ["a.b.c.example.co.uk", "a.b.c.example.co.uk"],
    ["my-site.example.com", "my-site.example.com"],
    ["123.example.com", "123.example.com"],
  ])("accepts %s", (input, expected) => {
    expect(validateCustomDomain(input)).toBe(expected);
  });

  it.each([
    ["", "empty"],
    ["localhost", "single label"],
    ["https://docs.example.com", "a URL"],
    ["docs.example.com/path", "a path"],
    ["docs.example.com:443", "a port"],
    ["-docs.example.com", "a leading dash"],
    ["docs-.example.com", "a trailing dash"],
    ["docs..example.com", "an empty label"],
    ["docs example.com", "a space"],
    ["docs.exâmple.com", "a non-ASCII character"],
    [`${"a".repeat(64)}.example.com`, "a label over 63 characters"],
  ])("rejects %s (%s)", (input) => {
    expect(() => validateCustomDomain(input)).toThrow();
  });

  // The alias namespace is shared with internal domains and branch aliases, so
  // claiming one of ours would hijack routing that belongs to another project.
  it.each([
    "dev.argos-ci.live",
    "anything.dev.argos-ci.live",
    "deep.nested.dev.argos-ci.live",
    // The target customers are told to point their own DNS at.
    "cname.dev.argos-ci.live",
  ])("rejects the reserved domain %s", (input) => {
    expect(() => validateCustomDomain(input)).toThrow(/reserved/i);
  });

  it("does not reject a domain that merely contains the base domain", () => {
    expect(validateCustomDomain("dev.argos-ci.live.example.com")).toBe(
      "dev.argos-ci.live.example.com",
    );
  });
});
