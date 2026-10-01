import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, describe, expect } from "vitest";

import { createSession } from "@/auth/session";
import { SESSION_COOKIE_NAME } from "@/auth/session-cookie";
import type { Account, StripeInvoice } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import router from "./invoice-documents";
import { createTestApp } from "./test-util";

const app = createTestApp(router);

const createSessionCookie = async (userId: string) => {
  const { rawToken } = await createSession({ userId });
  return `${SESSION_COOKIE_NAME}=${rawToken}`;
};

const test = base.extend<{
  teamAccount: Account;
  invoice: StripeInvoice;
}>({
  teamAccount: async ({}, use) => {
    await setupDatabase();
    const teamAccount = await factory.TeamAccount.create({
      stripeCustomerId: "cus_invoice_docs",
    });
    await use(teamAccount);
  },
  invoice: async ({ teamAccount }, use) => {
    invariant(teamAccount.stripeCustomerId, "Account has no customer");
    const invoice = await factory.StripeInvoice.create({
      stripeCustomerId: teamAccount.stripeCustomerId,
    });
    await use(invoice);
  },
});

// The success path redirects to Stripe and is left to the running app: it
// would need Stripe mocked, which proves only what the mock assumes.
describe("invoice documents", () => {
  test("sends a visitor without a session to log in first", async ({
    invoice,
  }) => {
    await request(app)
      .get(`/invoices/${invoice.id}/pdf`)
      .expect(302)
      .expect((res) => {
        const location = new URL(res.headers["location"] ?? "");
        expect(location.pathname).toBe("/login");
        expect(location.searchParams.get("r")).toContain(
          `/invoices/${invoice.id}/pdf`,
        );
      });
  });

  test("hides the invoice from a member who is not an admin", async ({
    teamAccount,
    invoice,
  }) => {
    invariant(teamAccount.teamId, "Account has no team");
    const teamUser = await factory.TeamUser.create({
      teamId: teamAccount.teamId,
      userLevel: "member",
    });

    await request(app)
      .get(`/invoices/${invoice.id}/view`)
      .set("Cookie", await createSessionCookie(teamUser.userId))
      .expect(404);
  });

  test("hides the invoice from another customer's admin", async ({
    invoice,
  }) => {
    const otherAccount = await factory.UserAccount.create();
    invariant(otherAccount.userId, "Account has no user");

    await request(app)
      .get(`/invoices/${invoice.id}/view`)
      .set("Cookie", await createSessionCookie(otherAccount.userId))
      .expect(404);
  });
});
