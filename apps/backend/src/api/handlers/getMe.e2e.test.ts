import request from "supertest";
import { test as base, describe, expect } from "vitest";

import {
  Account,
  Project,
  User,
  UserAccessTokenScope,
} from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";

import { createTestHandlerApp } from "../test-util";
import { getMe } from "./getMe";

const app = createTestHandlerApp(getMe);

const test = base.extend<{
  user: User;
  userAccount: Account;
  patToken: string;
  project: Project;
}>({
  user: async ({}, use) => {
    await setupDatabase();
    const user = await factory.User.create();
    await use(user);
  },
  userAccount: async ({ user }, use) => {
    const userAccount = await factory.UserAccount.create({
      userId: user.id,
      name: "Jane Doe",
      slug: "jane-doe",
    });
    await use(userAccount);
  },
  patToken: async ({ user, userAccount }, use) => {
    const token = `arp_${"e".repeat(36)}`;
    const userAccessToken = await factory.UserAccessToken.create({
      userId: user.id,
      token: hashToken(token),
    });
    await UserAccessTokenScope.query().insert({
      userAccessTokenId: userAccessToken.id,
      accountId: userAccount.id,
    });
    await use(token);
  },
  project: async ({}, use) => {
    const project = await factory.Project.create({
      token: "the-awesome-token",
    });
    await use(project);
  },
});

describe("getMe", () => {
  test("returns the authenticated user and its accessible accounts", async ({
    userAccount,
    patToken,
  }) => {
    await request(app)
      .get("/me")
      .set("Authorization", `Bearer ${patToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({
          id: userAccount.id,
          slug: "jane-doe",
          name: "Jane Doe",
          accounts: [
            {
              id: userAccount.id,
              slug: "jane-doe",
              name: "Jane Doe",
              type: "user",
            },
          ],
        });
      });
  });

  test("includes team accounts the token is scoped to", async ({
    user,
    userAccount,
  }) => {
    const teamAccount = await factory.TeamAccount.create({
      slug: "acme",
      name: "ACME",
    });
    await factory.TeamUser.create({
      teamId: teamAccount.teamId!,
      userId: user.id,
    });
    const token = `arp_${"t".repeat(36)}`;
    const userAccessToken = await factory.UserAccessToken.create({
      userId: user.id,
      token: hashToken(token),
    });
    await UserAccessTokenScope.query().insert([
      { userAccessTokenId: userAccessToken.id, accountId: userAccount.id },
      { userAccessTokenId: userAccessToken.id, accountId: teamAccount.id },
    ]);

    await request(app)
      .get("/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(
          res.body.accounts.map((account: { slug: string }) => account.slug),
        ).toEqual(expect.arrayContaining(["jane-doe", "acme"]));
        expect(
          res.body.accounts.find(
            (account: { slug: string }) => account.slug === "acme",
          ),
        ).toMatchObject({ type: "team", name: "ACME" });
      });
  });

  test("returns 401 with an unknown token", async ({ user: _user }) => {
    await request(app)
      .get("/me")
      .set("Authorization", `Bearer arp_${"f".repeat(36)}`)
      .expect(401)
      .expect((res) => {
        expect(res.body.error).toBe("Access token not found");
      });
  });

  test("rejects project tokens", async ({ project: _project }) => {
    await request(app)
      .get("/me")
      .set("Authorization", "Bearer the-awesome-token")
      .expect(401)
      .expect((res) => {
        expect(res.body.error).toContain(
          "This endpoint requires a personal access token.",
        );
      });
  });
});
