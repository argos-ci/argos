import { beforeAll, describe, expect, it } from "vitest";

import { getRedirectFromState } from "./oauth";

const ORIGIN = "https://app.argos-ci.com";

beforeAll(() => {
  Object.defineProperty(globalThis, "window", {
    value: { location: { origin: ORIGIN }, atob: globalThis.atob },
    configurable: true,
  });
});

function encodeState(redirect: string) {
  return btoa(JSON.stringify({ nonce: "nonce", redirect }));
}

describe("getRedirectFromState", () => {
  it.each([
    ["/acme/settings?tab=1#top", "/acme/settings?tab=1#top"],
    [`${ORIGIN}/acme`, "/acme"],
    ["https://evil.test/phish", "/"],
    ["//evil.test", "/"],
    ["javascript:alert(1)", "/"],
  ])("reads %s as %s", (redirect, expected) => {
    expect(getRedirectFromState(encodeState(redirect))).toBe(expected);
  });

  it("throws on a state that is not one Argos issued", () => {
    expect(() => getRedirectFromState("not-base64-json")).toThrow(
      "Failed to read OAuth state",
    );
  });
});
