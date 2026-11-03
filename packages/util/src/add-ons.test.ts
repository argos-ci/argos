import { describe, expect, it } from "vitest";

import { getAddOnsMonthlyPrice, getBilledAddOns } from "./add-ons";

const enabled = { githubSso: true, samlSso: true, staticIp: true };
const nothingIncluded = {
  githubSsoIncluded: false,
  samlIncluded: false,
  staticIpIncluded: false,
};

describe("getBilledAddOns", () => {
  it("bills every add-on enabled when the plan includes none", () => {
    expect(getBilledAddOns({ enabled, plan: nothingIncluded })).toEqual([
      "github-sso",
      "saml-sso",
      "static-ip",
    ]);
  });

  it("bills nothing the plan includes", () => {
    expect(
      getBilledAddOns({
        enabled,
        plan: { ...nothingIncluded, githubSsoIncluded: true },
      }),
    ).toEqual(["saml-sso", "static-ip"]);
  });

  it("bills nothing the team did not enable", () => {
    expect(
      getBilledAddOns({
        enabled: { githubSso: false, samlSso: true, staticIp: false },
        plan: nothingIncluded,
      }),
    ).toEqual(["saml-sso"]);
  });

  it("bills what is enabled when there is no plan", () => {
    expect(
      getBilledAddOns({
        enabled: { githubSso: true, samlSso: false, staticIp: false },
        plan: null,
      }),
    ).toEqual(["github-sso"]);
  });
});

describe("getAddOnsMonthlyPrice", () => {
  it("adds up the published prices", () => {
    expect(getAddOnsMonthlyPrice(["github-sso", "static-ip"])).toBe(250);
    expect(getAddOnsMonthlyPrice([])).toBe(0);
  });
});
