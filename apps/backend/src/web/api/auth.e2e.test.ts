import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { describe, expect, test } from "vitest";

import { createSamlAuthCode } from "@/auth/saml";
import type { Account } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { createTestApp } from "../test-util";
import router from "./auth";

const app = createTestApp(router);

const EMAIL = "jane@acme.com";
const SSO_SUBJECT = "idp-jane";

const samlTest = test.extend<{ samlTeamAccount: Account }>({
  samlTeamAccount: async ({}, use) => {
    await setupDatabase();
    await use(await factory.TeamAccount.create());
  },
});

/**
 * What the callback page does with the code the ACS endpoint hands it, once
 * the IdP has vouched for `EMAIL`.
 */
async function exchangeSamlCode(samlTeamAccount: Account) {
  const code = await createSamlAuthCode({
    teamAccountId: samlTeamAccount.id,
    email: EMAIL,
    ssoSubject: SSO_SUBJECT,
  });
  return request(app).post("/auth/saml").send({ code });
}

describe("POST /auth/saml", () => {
  samlTest(
    "sends an account it creates through the signup flow",
    async ({ samlTeamAccount }) => {
      const domainTeam = await factory.TeamAccount.create();
      invariant(domainTeam.teamId, "team account has no team");
      await factory.TeamDomain.create({
        teamId: domainTeam.teamId,
        domain: "acme.com",
      });

      const res = await exchangeSamlCode(samlTeamAccount);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ creation: true, hasAutoInvite: true });
    },
  );
});
