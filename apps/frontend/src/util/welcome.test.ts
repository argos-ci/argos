import { describe, expect, it } from "vitest";

import { getPostSignupURL, resolveWelcomeRedirect } from "./welcome";

describe("getPostSignupURL", () => {
  it("wraps the destination in the welcome page", () => {
    expect(getPostSignupURL("/acme")).toBe("/~/welcome?r=%2Facme");
  });

  it("goes to the welcome page bare when there is no destination", () => {
    expect(getPostSignupURL(null)).toBe("/~/welcome");
    expect(getPostSignupURL(undefined)).toBe("/~/welcome");
  });

  it("leaves team auto-creation alone, which welcomes on its own afterwards", () => {
    const target = "/teams/new?name=Acme&autoSubmit=true";
    expect(getPostSignupURL(target)).toBe(target);
  });

  it("still wraps the team form when it is not auto-submitting", () => {
    expect(getPostSignupURL("/teams/new?name=Acme")).toBe(
      "/~/welcome?r=%2Fteams%2Fnew%3Fname%3DAcme",
    );
  });

  it("does not mistake another host's team page for our own", () => {
    const target = "https://evil.test/teams/new?autoSubmit=true";
    expect(getPostSignupURL(target)).toBe(
      `/~/welcome?r=${encodeURIComponent(target)}`,
    );
  });
});

describe("resolveWelcomeRedirect", () => {
  it("keeps a same-origin path", () => {
    expect(resolveWelcomeRedirect("/acme")).toBe("/acme");
    expect(resolveWelcomeRedirect("/teams?r=%2Facme")).toBe("/teams?r=%2Facme");
  });

  it("falls back to the root when there is nothing to go to", () => {
    expect(resolveWelcomeRedirect(null)).toBe("/");
    expect(resolveWelcomeRedirect("")).toBe("/");
  });

  it("refuses anything that could leave the app", () => {
    expect(resolveWelcomeRedirect("https://evil.test")).toBe("/");
    expect(resolveWelcomeRedirect("//evil.test")).toBe("/");
    expect(resolveWelcomeRedirect("/\\evil.test")).toBe("/");
    expect(resolveWelcomeRedirect("javascript:alert(1)")).toBe("/");
    expect(resolveWelcomeRedirect("acme")).toBe("/");
  });
});
