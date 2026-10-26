import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, describe, expect, vi } from "vitest";

import { createSession } from "@/auth/session";
import { SESSION_COOKIE_NAME } from "@/auth/session-cookie";
import type { Account } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { createTestApp } from "@/web/test-util";

import { receiver } from "./app";

// Read once, when `./app` builds the receiver: without a state secret the
// install path cannot sign its OAuth state and the owner's request ends in a
// 500.
vi.hoisted(() => {
  process.env["SLACK_CLIENT_ID"] = "test-client-id";
  process.env["SLACK_STATE_SECRET"] = "test-state-secret";
});

const app = createTestApp(receiver.router);

const createSessionCookie = async (userId: string) => {
  const { rawToken } = await createSession({ userId });
  return `${SESSION_COOKIE_NAME}=${rawToken}`;
};

/**
 * Create a team member with the personal account every real user has: the
 * session only resolves to a user through it.
 */
const createTeamMember = async (
  teamAccount: Account,
  userLevel: "owner" | "member",
) => {
  invariant(teamAccount.teamId, "Account has no team");
  const userAccount = await factory.UserAccount.create();
  invariant(userAccount.userId, "Account has no user");
  await factory.TeamUser.create({
    teamId: teamAccount.teamId,
    userId: userAccount.userId,
    userLevel,
  });
  return userAccount.userId;
};

const test = base.extend<{ teamAccount: Account }>({
  teamAccount: async ({}, use) => {
    await setupDatabase();
    const teamAccount = await factory.TeamAccount.create();
    await use(teamAccount);
  },
});

describe("GET /auth/slack/login", () => {
  test("rejects a request without an account", async () => {
    await request(app).get("/auth/slack/login").expect(400);
  });

  test("sends a visitor without a session to log in first", async ({
    teamAccount,
  }) => {
    await request(app)
      .get(`/auth/slack/login?accountId=${teamAccount.id}`)
      .expect(302)
      .expect((res) => {
        const location = new URL(res.headers["location"] ?? "");
        expect(location.pathname).toBe("/login");
        expect(location.searchParams.get("r")).toContain(
          `/auth/slack/login?accountId=${teamAccount.id}`,
        );
      });
  });

  test("forbids a member who is not an owner", async ({ teamAccount }) => {
    const userId = await createTeamMember(teamAccount, "member");

    await request(app)
      .get(`/auth/slack/login?accountId=${teamAccount.id}`)
      .set("Cookie", await createSessionCookie(userId))
      .expect(403);
  });

  test("forbids a user outside the team", async ({ teamAccount }) => {
    const otherAccount = await factory.UserAccount.create();
    invariant(otherAccount.userId, "Account has no user");

    await request(app)
      .get(`/auth/slack/login?accountId=${teamAccount.id}`)
      .set("Cookie", await createSessionCookie(otherAccount.userId))
      .expect(403);
  });

  test("sends an owner to Slack with the account in a signed cookie", async ({
    teamAccount,
  }) => {
    const userId = await createTeamMember(teamAccount, "owner");

    await request(app)
      .get(`/auth/slack/login?accountId=${teamAccount.id}`)
      .set("Cookie", await createSessionCookie(userId))
      .expect(302)
      .expect((res) => {
        const location = new URL(res.headers["location"] ?? "");
        expect(location.host).toBe("slack.com");
        expect(res.headers["set-cookie"]).toEqual(
          expect.arrayContaining([
            expect.stringContaining(`slack_accountId=${teamAccount.id};`),
            expect.stringContaining("slack_accountId.sig="),
          ]),
        );
      });
  });
});
