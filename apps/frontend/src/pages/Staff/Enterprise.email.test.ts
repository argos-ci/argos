import { describe, expect, it } from "vitest";

import { BOOK_A_CALL_HREF } from "@/constants";

import { getEnterpriseOfferEmail, getRenewalEmail } from "./Enterprise.email";

const owner = { name: "Andre Dupont", email: "andre@example.com" };

describe("getEnterpriseOfferEmail", () => {
  it("greets a single owner by first name and names the team", () => {
    const { subject, body } = getEnterpriseOfferEmail({
      owners: [owner],
      teamName: "Acme",
    });
    expect(subject).toBe("A better price for Acme on Argos");
    expect(body).toMatch(/^Hi Andre,/);
    expect(body).toContain("I noticed that Acme runs a lot of screenshots");
  });

  it("greets the team when there are several owners", () => {
    const { body } = getEnterpriseOfferEmail({
      owners: [owner, { name: "Shibili", email: "shibili@example.com" }],
      teamName: "Acme",
    });
    expect(body).toMatch(/^Hi team,/);
  });

  it("links to the call and names no amount", () => {
    const { body } = getEnterpriseOfferEmail({
      owners: [owner],
      teamName: "Acme",
    });
    expect(body).toContain(BOOK_A_CALL_HREF);
    expect(body).not.toMatch(/[$€]|\d,\d{3}/);
  });
});

describe("getRenewalEmail", () => {
  const renewsOn = new Date(2027, 7, 19);

  it("names the team and the renewal date", () => {
    const { subject, body } = getRenewalEmail({
      owners: [owner],
      teamName: "Acme",
      renewsOn,
    });
    expect(subject).toBe("Your Argos plan renews on August 19, 2027");
    expect(body).toMatch(/^Hi Andre,/);
    expect(body).toContain(
      "The annual Argos plan of Acme renews on August 19, 2027.",
    );
  });

  it("links to the call and names no usage or amount", () => {
    const { body } = getRenewalEmail({
      owners: [owner],
      teamName: "Acme",
      renewsOn,
    });
    expect(body).toContain(BOOK_A_CALL_HREF);
    expect(body).not.toMatch(/[$€%]|screenshots/);
  });
});
