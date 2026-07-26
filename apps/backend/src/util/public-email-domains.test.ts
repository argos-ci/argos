import { describe, expect, it } from "vitest";

import { checkIsPublicEmailDomain } from "./public-email-domains";

describe("checkIsPublicEmailDomain", () => {
  it("recognizes consumer providers", () => {
    expect(checkIsPublicEmailDomain("gmail.com")).toBe(true);
    expect(checkIsPublicEmailDomain("hotmail.fr")).toBe(true);
    expect(checkIsPublicEmailDomain("icloud.com")).toBe(true);
    expect(checkIsPublicEmailDomain("proton.me")).toBe(true);
    // Reported at GitBook as a domain that pulled people into unrelated orgs.
    expect(checkIsPublicEmailDomain("fastmail.com")).toBe(true);
    expect(checkIsPublicEmailDomain("mailinator.com")).toBe(true);
  });

  it("recognizes the providers the package misses", () => {
    // Guards the local additions: should any of these land upstream, the test
    // keeps passing, and it fails loudly if a version bump drops them.
    expect(checkIsPublicEmailDomain("hey.com")).toBe(true);
    expect(checkIsPublicEmailDomain("tutanota.com")).toBe(true);
    expect(checkIsPublicEmailDomain("mailbox.org")).toBe(true);
    expect(checkIsPublicEmailDomain("sfr.fr")).toBe(true);
  });

  it("treats company domains as private", () => {
    expect(checkIsPublicEmailDomain("argos-ci.com")).toBe(false);
    expect(checkIsPublicEmailDomain("gitbook.io")).toBe(false);
  });

  it("normalizes case and surrounding space", () => {
    expect(checkIsPublicEmailDomain("  GMail.COM ")).toBe(true);
  });

  it("does not match a company domain that merely ends with a provider's", () => {
    expect(checkIsPublicEmailDomain("notgmail.com")).toBe(false);
    expect(checkIsPublicEmailDomain("mail.gmail.com")).toBe(false);
  });
});
