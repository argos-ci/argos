import { describe, expect, it } from "vitest";

import { getMailtoUrl, getOutreachEmail } from "./Trials.email";

const owner = { name: "Andre Dupont", email: "andre@example.com" };

describe("getOutreachEmail", () => {
  it("greets a single owner by first name", () => {
    const { body } = getOutreachEmail({
      owners: [owner],
      buildsCount: 0,
      hasCheckBuild: false,
      isLost: false,
    });
    expect(body).toMatch(/^Hi Andre,/);
  });

  it("greets the team when there are several owners", () => {
    const { body } = getOutreachEmail({
      owners: [owner, { name: "Shibili", email: "shibili@example.com" }],
      buildsCount: 0,
      hasCheckBuild: false,
      isLost: false,
    });
    expect(body).toMatch(/^Hi team,/);
  });

  it("keeps hyphenated given names", () => {
    const { body } = getOutreachEmail({
      owners: [{ name: "Jean-Pierre Martin", email: "jp@example.com" }],
      buildsCount: 0,
      hasCheckBuild: false,
      isLost: false,
    });
    expect(body).toMatch(/^Hi Jean-Pierre,/);
  });

  it.each([
    ["a slug-like name", "acme-bot"],
    ["a lowercase name", "shibili"],
    ["a name starting with a digit", "42 Industries"],
    ["an empty name", "   "],
  ])("falls back to a neutral greeting for %s", (_label, name) => {
    const { body } = getOutreachEmail({
      owners: [{ name, email: "someone@example.com" }],
      buildsCount: 0,
      hasCheckBuild: false,
      isLost: false,
    });
    expect(body).toMatch(/^Hi team,/);
  });

  it("greets by name when the owner has no name at all", () => {
    const { body } = getOutreachEmail({
      owners: [{ name: null, email: "someone@example.com" }],
      buildsCount: 0,
      hasCheckBuild: false,
      isLost: false,
    });
    expect(body).toMatch(/^Hi team,/);
  });

  it("offers help when the team only ever produced orphan builds", () => {
    const email = getOutreachEmail({
      owners: [owner],
      buildsCount: 12,
      hasCheckBuild: false,
      isLost: false,
    });
    expect(email.body).toContain("orphan builds");
    expect(email.subject).toBe("Need help with Argos?");
  });

  it("welcomes a team that already got a check build", () => {
    const email = getOutreachEmail({
      owners: [owner],
      buildsCount: 12,
      hasCheckBuild: true,
      isLost: false,
    });
    expect(email.body).not.toContain("orphan builds");
    expect(email.subject).toBe("Welcome to Argos!");
  });

  it("welcomes a team that has not built yet", () => {
    // No build at all is silence, not a setup problem.
    const email = getOutreachEmail({
      owners: [owner],
      buildsCount: 0,
      hasCheckBuild: false,
      isLost: false,
    });
    expect(email.body).not.toContain("orphan builds");
  });

  it("asks for feedback when the team is lost", () => {
    const email = getOutreachEmail({
      owners: [owner],
      buildsCount: 12,
      hasCheckBuild: true,
      isLost: true,
    });
    expect(email.subject).toBe("Quick feedback on Argos");
    expect(email.body).toMatch(/^Hi Andre,/);
    expect(email.body).toContain("you stopped testing Argos");
  });

  it("asks a lost team for feedback rather than about its orphan builds", () => {
    // Onboarding help is beside the point once the trial is over.
    const email = getOutreachEmail({
      owners: [owner],
      buildsCount: 12,
      hasCheckBuild: false,
      isLost: true,
    });
    expect(email.body).not.toContain("orphan builds");
    expect(email.subject).toBe("Quick feedback on Argos");
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
