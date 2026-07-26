import { beforeAll, describe, expect, it } from "vitest";

import { getPostAuthURL, resolveWelcomeRedirect } from "./welcome";

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

describe("getPostAuthURL", () => {
  it("sends a returning user straight to their destination", () => {
    expect(
      getPostAuthURL({
        creation: false,
        hasAutoInvite: true,
        redirect: "/acme",
      }),
    ).toBe("/acme");
    expect(
      getPostAuthURL({ creation: false, hasAutoInvite: false, redirect: null }),
    ).toBe("/");
  });

  it("routes an auto-invite signup through the teams list", () => {
    expect(
      getPostAuthURL({
        creation: true,
        hasAutoInvite: true,
        redirect: "/acme",
      }),
    ).toBe(`/~/welcome?r=${encodeURIComponent("/teams?r=%2Facme")}`);
  });

  it("recognises team auto-creation even alongside an auto-invite", () => {
    // The auto-invite detour buries the destination in a nested `r=`, so the
    // team-creation check has to run on the original value — otherwise the
    // welcome page opens before the team exists and the domain question is lost.
    const target = "/teams/new?name=Acme&autoSubmit=true";
    expect(
      getPostAuthURL({ creation: true, hasAutoInvite: true, redirect: target }),
    ).toBe(target);
  });
});

describe("getPostAuthURL for a new account", () => {
  it("wraps the destination in the welcome page", () => {
    expect(
      getPostAuthURL({
        creation: true,
        hasAutoInvite: false,
        redirect: "/acme",
      }),
    ).toBe("/~/welcome?r=%2Facme");
  });

  it("goes to the welcome page bare when there is no destination", () => {
    expect(
      getPostAuthURL({ creation: true, hasAutoInvite: false, redirect: null }),
    ).toBe("/~/welcome");
    expect(
      getPostAuthURL({
        creation: true,
        hasAutoInvite: false,
        redirect: undefined,
      }),
    ).toBe("/~/welcome");
  });

  it("leaves team auto-creation alone, which welcomes on its own afterwards", () => {
    const target = "/teams/new?name=Acme&autoSubmit=true";
    expect(
      getPostAuthURL({
        creation: true,
        hasAutoInvite: false,
        redirect: target,
      }),
    ).toBe(target);
  });

  it("still wraps the team form when it is not auto-submitting", () => {
    expect(
      getPostAuthURL({
        creation: true,
        hasAutoInvite: false,
        redirect: "/teams/new?name=Acme",
      }),
    ).toBe("/~/welcome?r=%2Fteams%2Fnew%3Fname%3DAcme");
  });

  it("does not mistake another host's team page for our own", () => {
    const target = "https://evil.test/teams/new?autoSubmit=true";
    expect(
      getPostAuthURL({
        creation: true,
        hasAutoInvite: false,
        redirect: target,
      }),
    ).toBe(`/~/welcome?r=${encodeURIComponent(target)}`);
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
    const welcomeUrl = getPostAuthURL({
      creation: true,
      hasAutoInvite: false,
      redirect: cliUrl,
    });
    const r = new URL(welcomeUrl, ORIGIN).searchParams.get("r");
    expect(resolveWelcomeRedirect(r)).toBe("/auth/cli?port=1234&state=abc");
  });
});
