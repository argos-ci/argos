import { describe, expect, it } from "vitest";

import { getAddOnsMonthlyPrice, getBilledAddOns } from "./add-ons";

const enabled = { "github-sso": true, "saml-sso": true, "static-ip": true };
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
        enabled: { "github-sso": false, "saml-sso": true, "static-ip": false },
        plan: nothingIncluded,
      }),
    ).toEqual(["saml-sso"]);
  });

  it("bills what is enabled when there is no plan", () => {
    expect(
      getBilledAddOns({
        enabled: { "github-sso": true, "saml-sso": false, "static-ip": false },
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
