import {
  CNAMEAlreadyExists,
  EntityLimitExceeded,
  InvalidArgument,
} from "@aws-sdk/client-cloudfront";
import { describe, expect, it } from "vitest";

import type { AccountSubscriptionStatus } from "@/database/models/Account";

import {
  getCustomDomainsAvailability,
  getReconcileErrorMessage,
  validateCustomDomain,
  type CustomDomainsAvailability,
} from "./custom-domain";

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

describe("getCustomDomainsAvailability", () => {
  function availability(input: {
    accountType?: "user" | "team";
    hasForcedPlan?: boolean;
    subscriptionStatus?: AccountSubscriptionStatus | null;
    planIncludesCustomDomains?: boolean;
  }): CustomDomainsAvailability {
    return getCustomDomainsAvailability({
      accountType: input.accountType ?? "team",
      hasForcedPlan: input.hasForcedPlan ?? false,
      subscriptionStatus: input.subscriptionStatus ?? null,
      planIncludesCustomDomains: input.planIncludesCustomDomains ?? true,
    });
  }

  // No plan to upgrade, so no amount of paying changes the answer.
  it.each([
    { hasForcedPlan: false, subscriptionStatus: null },
    { hasForcedPlan: true, subscriptionStatus: "active" as const },
    { hasForcedPlan: false, subscriptionStatus: "active" as const },
  ])("sends a personal account to a team (%o)", (input) => {
    expect(availability({ ...input, accountType: "user" })).toBe(
      "requires_team",
    );
  });

  it("unlocks a paying team on a plan that includes it", () => {
    expect(availability({ subscriptionStatus: "active" })).toBe("available");
  });

  it("unlocks a trial with a payment method on file", () => {
    expect(
      availability({ subscriptionStatus: "trialing_with_payment_method" }),
    ).toBe("available");
  });

  // These all resolve a plan through `getPlan()`, which is exactly why the
  // plan flag alone cannot be the gate.
  it.each([
    "trialing",
    "past_due",
    "unpaid",
    "canceled",
    "trial_expired",
  ] as const)("asks a team on %s to subscribe", (subscriptionStatus) => {
    expect(availability({ subscriptionStatus })).toBe("requires_subscription");
  });

  it("asks a team with no subscription at all to subscribe", () => {
    expect(
      availability({
        subscriptionStatus: null,
        planIncludesCustomDomains: false,
      }),
    ).toBe("requires_subscription");
  });

  it("unlocks a forced plan that includes it, without any subscription", () => {
    expect(
      availability({ hasForcedPlan: true, subscriptionStatus: null }),
    ).toBe("available");
  });

  it("sends a forced plan without it to contact us", () => {
    expect(
      availability({
        hasForcedPlan: true,
        subscriptionStatus: null,
        planIncludesCustomDomains: false,
      }),
    ).toBe("requires_contact");
  });

  it("sends a paying team on a plan without it to contact us", () => {
    expect(
      availability({
        subscriptionStatus: "active",
        planIncludesCustomDomains: false,
      }),
    ).toBe("requires_contact");
  });
});

describe("getReconcileErrorMessage", () => {
  // A hostname already in use elsewhere is the whole story in one sentence, and
  // it is the customer's to act on — so it is passed through verbatim.
  it("passes a terminal CloudFront message through", () => {
    const error = new CNAMEAlreadyExists({
      message: "One or more of the CNAMEs you provided are already associated",
      $metadata: {},
    });
    expect(getReconcileErrorMessage(error)).toBe(
      "One or more of the CNAMEs you provided are already associated",
    );
  });

  // Everything else is ours to fix. Surfacing the raw exception told customers
  // who had done nothing wrong to go and re-check a DNS record that was fine.
  it.each([
    [
      "our own tenant quota",
      new EntityLimitExceeded({ message: "Limit exceeded", $metadata: {} }),
    ],
    [
      "a misconfiguration",
      new InvalidArgument({ message: "AccessDenied", $metadata: {} }),
    ],
    ["a plain error", new Error("socket hang up")],
  ])("reports %s as ours rather than the customer's", (_label, error) => {
    const message = getReconcileErrorMessage(error);
    expect(message).toMatch(/no action is needed on your side/i);
    expect(message).not.toContain("Limit exceeded");
    expect(message).not.toContain("AccessDenied");
    expect(message).not.toContain("socket hang up");
  });
});
