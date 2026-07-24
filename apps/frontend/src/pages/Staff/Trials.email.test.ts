import { describe, expect, it } from "vitest";

import { getMailtoUrl, getOnboardingEmail } from "./Trials.email";

const owner = { name: "Andre Dupont", email: "andre@example.com" };

describe("getOnboardingEmail", () => {
  it("greets a single owner by first name", () => {
    const { body } = getOnboardingEmail({
      owners: [owner],
      buildsCount: 0,
      hasCheckBuild: false,
    });
    expect(body).toMatch(/^Hi Andre,/);
  });

  it("greets the team when there are several owners", () => {
    const { body } = getOnboardingEmail({
      owners: [owner, { name: "Shibili", email: "shibili@example.com" }],
      buildsCount: 0,
      hasCheckBuild: false,
    });
    expect(body).toMatch(/^Hi team,/);
  });

  it("keeps hyphenated given names", () => {
    const { body } = getOnboardingEmail({
      owners: [{ name: "Jean-Pierre Martin", email: "jp@example.com" }],
      buildsCount: 0,
      hasCheckBuild: false,
    });
    expect(body).toMatch(/^Hi Jean-Pierre,/);
  });

  it.each([
    ["a slug-like name", "acme-bot"],
    ["a lowercase name", "shibili"],
    ["a name starting with a digit", "42 Industries"],
    ["an empty name", "   "],
  ])("falls back to a neutral greeting for %s", (_label, name) => {
    const { body } = getOnboardingEmail({
      owners: [{ name, email: "someone@example.com" }],
      buildsCount: 0,
      hasCheckBuild: false,
    });
    expect(body).toMatch(/^Hi team,/);
  });

  it("greets by name when the owner has no name at all", () => {
    const { body } = getOnboardingEmail({
      owners: [{ name: null, email: "someone@example.com" }],
      buildsCount: 0,
      hasCheckBuild: false,
    });
    expect(body).toMatch(/^Hi team,/);
  });

  it("offers help when the team only ever produced orphan builds", () => {
    const email = getOnboardingEmail({
      owners: [owner],
      buildsCount: 12,
      hasCheckBuild: false,
    });
    expect(email.body).toContain("orphan builds");
    expect(email.subject).toBe("Argos — help with your setup?");
  });

  it("welcomes a team that already got a check build", () => {
    const email = getOnboardingEmail({
      owners: [owner],
      buildsCount: 12,
      hasCheckBuild: true,
    });
    expect(email.body).not.toContain("orphan builds");
    expect(email.subject).toBe("Welcome to Argos!");
  });

  it("welcomes a team that has not built yet", () => {
    // No build at all is silence, not a setup problem.
    const email = getOnboardingEmail({
      owners: [owner],
      buildsCount: 0,
      hasCheckBuild: false,
    });
    expect(email.body).not.toContain("orphan builds");
  });
});

describe("getMailtoUrl", () => {
  it("addresses every owner", () => {
    const url = getMailtoUrl({
      owners: [owner, { name: "Shibili", email: "shibili@example.com" }],
      subject: "Hello",
      body: "Hi",
    });
    expect(url).toContain("mailto:andre@example.com,shibili@example.com");
  });

  it("encodes spaces as %20 rather than +", () => {
    const url = getMailtoUrl({
      owners: [owner],
      subject: "Welcome to Argos!",
      body: "Hi Andre,\n\nWelcome!",
    });
    // A `+` would show up literally in the drafted mail.
    expect(url).not.toContain("+");
    expect(url).toContain("%20");
    expect(url).toContain("%0A");
  });

  it("returns null when no owner has an address", () => {
    const url = getMailtoUrl({
      owners: [{ name: "Andre", email: null }],
      subject: "Hello",
      body: "Hi",
    });
    expect(url).toBeNull();
  });
});
