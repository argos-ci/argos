import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { describe, expect, test } from "vitest";

import { createSamlAuthCode } from "@/auth/saml";
import { TeamUser, type Account } from "@/database/models";
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

  samlTest(
    "vouches only for the team whose IdP answered",
    async ({ samlTeamAccount }) => {
      const userAccount = await factory.UserAccount.create();
      const otherTeamAccount = await factory.TeamAccount.create();
      invariant(userAccount.userId, "user account has no user");
      invariant(samlTeamAccount.teamId, "team account has no team");
      invariant(otherTeamAccount.teamId, "team account has no team");
      await Promise.all([
        factory.TeamUser.create({
          teamId: samlTeamAccount.teamId,
          userId: userAccount.userId,
          ssoSubject: SSO_SUBJECT,
          lastAuthMethod: "github",
        }),
        factory.TeamUser.create({
          teamId: otherTeamAccount.teamId,
          userId: userAccount.userId,
          lastAuthMethod: "github",
        }),
      ]);

      const res = await exchangeSamlCode(samlTeamAccount);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ creation: false, hasAutoInvite: false });
      const lastAuthMethods = Object.fromEntries(
        (await TeamUser.query().where("userId", userAccount.userId)).map(
          (teamUser) => [teamUser.teamId, teamUser.lastAuthMethod],
        ),
      );
      expect(lastAuthMethods).toEqual({
        [samlTeamAccount.teamId]: "saml",
        [otherTeamAccount.teamId]: "github",
      });
    },
  );
});
