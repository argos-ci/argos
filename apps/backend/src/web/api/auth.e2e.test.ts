import { invariant } from "@argos/util/invariant";
import { describe, expect, test } from "vitest";

import type { Account } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { exchangeSamlCode } from "./auth.test-util";

const EMAIL = "jane@acme.com";
const SSO_SUBJECT = "idp-jane";

const samlTest = test.extend<{ samlTeamAccount: Account }>({
  samlTeamAccount: async ({}, use) => {
    await setupDatabase();
    await use(await factory.TeamAccount.create());
  },
});

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

      const res = await exchangeSamlCode({
        teamAccount: samlTeamAccount,
        email: EMAIL,
        ssoSubject: SSO_SUBJECT,
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ creation: true, hasAutoInvite: true });
    },
  );
});
