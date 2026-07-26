import { beforeAll, describe, expect, it } from "vitest";

import { getPostSignupURL, resolveWelcomeRedirect } from "./welcome";

const ORIGIN = "https://app.argos-ci.com";

beforeAll(() => {
  // The module reads `window.location.origin` to decide what counts as
  // same-origin. There is no DOM in the unit environment, so stub the one
  // property it touches rather than pull in jsdom for a pure function.
  Object.defineProperty(globalThis, "window", {
    value: { location: { origin: ORIGIN } },
    configurable: true,
  });
});

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
  });

  it("refuses control characters the URL parser strips before resolving", () => {
    // Each of these leaves the origin once the parser removes the control
    // character: `/<TAB>/evil.test` resolves as `//evil.test`. A prefix check on
    // the raw string sees a path and lets them through.
    expect(resolveWelcomeRedirect("/\t/evil.test")).toBe("/");
    expect(resolveWelcomeRedirect("/\n/evil.test")).toBe("/");
    expect(resolveWelcomeRedirect("/\r/evil.test")).toBe("/");
    expect(resolveWelcomeRedirect("/\t\\evil.test")).toBe("/");
    expect(resolveWelcomeRedirect("/\t//evil.test")).toBe("/");
  });

  it("normalizes what it keeps, so the caller navigates to a parsed path", () => {
    expect(resolveWelcomeRedirect("/acme/../other")).toBe("/other");
    expect(resolveWelcomeRedirect("/acme#top")).toBe("/acme#top");
    // A bare reference is same-origin, so it is kept — as an absolute path.
    expect(resolveWelcomeRedirect("acme")).toBe("/acme");
  });

  it("keeps a same-origin absolute destination", () => {
    // `AuthCLI` and `OAuthAuthorize` pass `window.location.href`, so dropping
    // absolute URLs stranded first-time CLI logins on the dashboard.
    expect(
      resolveWelcomeRedirect(`${ORIGIN}/auth/cli?port=1234&state=abc`),
    ).toBe("/auth/cli?port=1234&state=abc");
  });
});

describe("the CLI login round trip", () => {
  it("returns the user to the CLI callback after the welcome page", () => {
    const cliUrl = `${ORIGIN}/auth/cli?port=1234&state=abc`;
    const welcomeUrl = getPostSignupURL(cliUrl);
    const r = new URL(welcomeUrl, ORIGIN).searchParams.get("r");
    expect(resolveWelcomeRedirect(r)).toBe("/auth/cli?port=1234&state=abc");
  });
});
