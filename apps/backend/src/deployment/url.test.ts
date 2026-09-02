import { describe, expect, it } from "vitest";

import {
  checkIsCustomDomainAlias,
  getDeploymentAliasUrl,
  getDeploymentPreferredUrl,
} from "./url";

// The base domain is `dev.argos-ci.live` in tests.
describe("checkIsCustomDomainAlias", () => {
  it.each([
    { type: "domain" as const, alias: "docs.example.com" },
    { type: "domain" as const, alias: "example.com" },
    { type: "domain" as const, alias: "DOCS.EXAMPLE.COM" },
    // Merely containing the base domain is not being under it.
    { type: "domain" as const, alias: "dev.argos-ci.live.example.com" },
  ])("recognises $alias as the customer's", (alias) => {
    expect(checkIsCustomDomainAlias(alias)).toBe(true);
  });

  it.each([
    { type: "domain" as const, alias: "my-project.dev.argos-ci.live" },
    { type: "domain" as const, alias: "dev.argos-ci.live" },
    { type: "domain" as const, alias: "MY-PROJECT.DEV.ARGOS-CI.LIVE" },
    // A branch alias is ours whatever it looks like.
    { type: "branch" as const, alias: "docs.example.com" },
    { type: "branch" as const, alias: "main" },
  ])("recognises $alias as ours", (alias) => {
    expect(checkIsCustomDomainAlias(alias)).toBe(false);
  });
});

describe("getDeploymentAliasUrl", () => {
  it("uses a domain alias as the hostname", () => {
    expect(
      getDeploymentAliasUrl({ type: "domain", alias: "docs.example.com" }),
    ).toBe("https://docs.example.com/");
  });

  it("puts a branch alias under the base domain", () => {
    expect(getDeploymentAliasUrl({ type: "branch", alias: "main-abc" })).toBe(
      "https://main-abc.dev.argos-ci.live/",
    );
  });
});

describe("getDeploymentPreferredUrl", () => {
  it("prefers a custom domain over everything else", () => {
    expect(
      getDeploymentPreferredUrl({
        slug: "deployment-1",
        aliases: [
          { type: "branch", alias: "main" },
          { type: "domain", alias: "my-project.dev.argos-ci.live" },
          { type: "domain", alias: "docs.example.com" },
        ],
      }),
    ).toBe("https://docs.example.com/");
  });

  // The slug URL is immutable, unlike the internal domain, so it stays the
  // fallback rather than being replaced by a domain no more recognisable.
  it.each([
    ["no aliases", []],
    ["only a branch alias", [{ type: "branch" as const, alias: "main" }]],
    [
      "only an internal domain",
      [{ type: "domain" as const, alias: "my-project.dev.argos-ci.live" }],
    ],
  ])("falls back to the slug URL with %s", (_label, aliases) => {
    expect(getDeploymentPreferredUrl({ slug: "deployment-1", aliases })).toBe(
      "https://deployment-1.dev.argos-ci.live/",
    );
  });
});
