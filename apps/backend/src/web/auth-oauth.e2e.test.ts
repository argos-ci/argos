import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, describe, expect } from "vitest";

import { verifyInstallState } from "@/auth/install-state";
import { createSession } from "@/auth/session";
import { SESSION_COOKIE_NAME } from "@/auth/session-cookie";
import type { Account } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import router from "./auth-oauth";
import { createTestApp } from "./test-util";

const app = createTestApp(router);

const createSessionCookie = async (account: Account) => {
  invariant(account.userId, "Account has no user");
  const { rawToken } = await createSession({
    userId: account.userId,
    method: "email",
  });
  return `${SESSION_COOKIE_NAME}=${rawToken}`;
};

/**
 * A team with a member at the given level.
 */
async function createTeamWithMember(userLevel: "owner" | "member") {
  const teamAccount = await factory.TeamAccount.create();
  invariant(teamAccount.teamId, "Account has no team");
  const memberAccount = await factory.UserAccount.create();
  invariant(memberAccount.userId, "Account has no user");
  await factory.TeamUser.create({
    teamId: teamAccount.teamId,
    userId: memberAccount.userId,
    userLevel,
  });
  return { teamAccount, memberAccount };
}

const test = base.extend<{ db: void }>({
  db: [
    async ({}, use) => {
      await setupDatabase();
      await use();
    },
    { auto: true },
  ],
});

describe("GET /auth/github-light/install", () => {
  test("sends an admin to GitHub with a state signed for the account", async () => {
    const { teamAccount, memberAccount } = await createTeamWithMember("owner");
    const res = await request(app)
      .get("/auth/github-light/install")
      .query({ accountId: teamAccount.id })
      .set("Cookie", await createSessionCookie(memberAccount))
      .expect(302);
    const location = new URL(res.headers["location"] ?? "");
    expect(location.pathname).toMatch(/\/installations\/new$/);
    const state = location.searchParams.get("state");
    invariant(state, "Missing state");
    expect(verifyInstallState("github-light-install", state)).toEqual({
      accountId: teamAccount.id,
    });
  });

  test("refuses a member who is not an admin", async () => {
    const { teamAccount, memberAccount } = await createTeamWithMember("member");
    await request(app)
      .get("/auth/github-light/install")
      .query({ accountId: teamAccount.id })
      .set("Cookie", await createSessionCookie(memberAccount))
      .expect(404);
  });

  test("sends a visitor without a session to log in first", async () => {
    const teamAccount = await factory.TeamAccount.create();
    const res = await request(app)
      .get("/auth/github-light/install")
      .query({ accountId: teamAccount.id })
      .expect(302);
    expect(new URL(res.headers["location"] ?? "").pathname).toBe("/login");
  });
});
