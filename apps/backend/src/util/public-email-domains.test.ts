import { describe, expect, it } from "vitest";

import { checkIsPublicEmailDomain } from "./public-email-domains";

describe("checkIsPublicEmailDomain", () => {
  it("recognizes consumer providers", async () => {
    await expect(checkIsPublicEmailDomain("gmail.com")).resolves.toBe(true);
    await expect(checkIsPublicEmailDomain("hotmail.fr")).resolves.toBe(true);
    await expect(checkIsPublicEmailDomain("icloud.com")).resolves.toBe(true);
    await expect(checkIsPublicEmailDomain("proton.me")).resolves.toBe(true);
    // Reported at GitBook as a domain that pulled people into unrelated orgs.
    await expect(checkIsPublicEmailDomain("fastmail.com")).resolves.toBe(true);
    await expect(checkIsPublicEmailDomain("mailinator.com")).resolves.toBe(
      true,
    );
  });

  it("recognizes the providers the package misses", async () => {
    // Covers the local additions. It cannot detect the package dropping them,
    // since they are unioned in unconditionally — it guards this list, not the
    // dependency.
    await expect(checkIsPublicEmailDomain("hey.com")).resolves.toBe(true);
    await expect(checkIsPublicEmailDomain("tutanota.com")).resolves.toBe(true);
    await expect(checkIsPublicEmailDomain("mailbox.org")).resolves.toBe(true);
    await expect(checkIsPublicEmailDomain("sfr.fr")).resolves.toBe(true);
  });

  it("treats company domains as private", async () => {
    await expect(checkIsPublicEmailDomain("argos-ci.com")).resolves.toBe(false);
    await expect(checkIsPublicEmailDomain("gitbook.io")).resolves.toBe(false);
  });

  it("normalizes case and surrounding space", async () => {
    await expect(checkIsPublicEmailDomain("  GMail.COM ")).resolves.toBe(true);
  });

  it("does not match a company domain that merely ends with a provider's", async () => {
    await expect(checkIsPublicEmailDomain("notgmail.com")).resolves.toBe(false);
    await expect(checkIsPublicEmailDomain("mail.gmail.com")).resolves.toBe(
      false,
    );
  });
});
