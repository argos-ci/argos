import { invariant } from "@argos/util/invariant";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { TeamUser } from "@/database/models";
import { getMonthlyReportUnsubscribeUrl } from "@/database/services/monthly-report-unsubscribe";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { createApolloServerApp } from "./util";

async function setupOwner() {
  const teamAccount = await factory.TeamAccount.create({
    name: "Acme",
    slug: "acme",
  });
  invariant(teamAccount.teamId, "team account has no team");
  const user = await factory.User.create();
  const teamUser = await factory.TeamUser.create({
    teamId: teamAccount.teamId,
    userId: user.id,
    userLevel: "owner",
  });
  return { teamAccountId: teamAccount.id, userId: user.id, teamUser };
}

async function unsubscribe(token: string) {
  // No session: the link is opened from a mail client.
  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    null,
  );
  return request(app)
    .post("/graphql")
    .send({
      query: `
        mutation UnsubscribeFromMonthlyReport($token: String!) {
          unsubscribeFromMonthlyReport(token: $token) {
            teamName
            teamSlug
          }
        }
      `,
      variables: { token },
    });
}

async function getOptedOutAt(teamUser: TeamUser) {
  const fresh = await TeamUser.query().findById(teamUser.id).throwIfNotFound();
  return fresh.monthlyReportOptedOutAt;
}

describe("GraphQL unsubscribeFromMonthlyReport", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("turns the report off for the owner and the team the link names", async () => {
    const { teamAccountId, userId, teamUser } = await setupOwner();
    const token = new URL(
      getMonthlyReportUnsubscribeUrl({ userId, teamAccountId }, new Date()),
    ).searchParams.get("token");
    invariant(token, "the unsubscribe URL carries a token");

    const res = await unsubscribe(token);

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.unsubscribeFromMonthlyReport).toEqual({
      teamName: "Acme",
      teamSlug: "acme",
    });
    const optedOutAt = await getOptedOutAt(teamUser);
    expect(optedOutAt).not.toBeNull();

    // Opening the link again keeps the date the report was first turned off.
    const again = await unsubscribe(token);
    expect(again.body.errors).toBeUndefined();
    expect(await getOptedOutAt(teamUser)).toEqual(optedOutAt);
  });

  it("rejects a token Argos did not sign", async () => {
    const { teamAccountId, userId, teamUser } = await setupOwner();
    const forged = jwt.sign({ userId, teamAccountId }, "not the secret", {
      algorithm: "HS256",
      audience: "monthly-report-unsubscribe",
      expiresIn: 60,
    });

    const res = await unsubscribe(forged);

    expect(res.body.errors?.[0]?.extensions.argosErrorCode).toBe(
      "MONTHLY_REPORT_UNSUBSCRIBE_TOKEN_INVALID",
    );
    expect(await getOptedOutAt(teamUser)).toBeNull();
  });
});
