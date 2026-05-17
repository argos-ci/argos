import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { Account, User } from "@/database/models";
import { hashToken } from "@/database/services/crypto";
import { factory, setupDatabase } from "@/database/testing";
import { getRedisClient } from "@/util/redis/client";
import { setupRedis } from "@/util/redis/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

setupRedis();

async function seedDeletionToken(input: { token: string; accountId: string }) {
  const redis = await getRedisClient();
  await redis.set(
    `account_deletion:${hashToken(input.token)}`,
    input.accountId,
    { expiration: { type: "PX", value: 60 * 1000 } },
  );
}

async function getStoredDeletionToken(token: string) {
  const redis = await getRedisClient();
  return redis.get(`account_deletion:${hashToken(token)}`);
}

describe("GraphQL requestAccountDeletion", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("requires authentication", async () => {
    const userAccount = await factory.UserAccount.create();

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      null,
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation RequestAccountDeletion($input: RequestAccountDeletionInput!) {
            requestAccountDeletion(input: $input)
          }
        `,
        variables: { input: { accountId: userAccount.id } },
      });

    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].extensions.code).toBe("UNAUTHENTICATED");
  });

  it("rejects a team account", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    const teamAccount = await factory.TeamAccount.create();
    await factory.TeamUser.create({
      teamId: teamAccount.teamId!,
      userId: userAccount.userId!,
      userLevel: "owner",
    });

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: userAccount.user!, account: userAccount },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation RequestAccountDeletion($input: RequestAccountDeletionInput!) {
            requestAccountDeletion(input: $input)
          }
        `,
        variables: { input: { accountId: teamAccount.id } },
      });

    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toMatch(/only available for user/i);
  });

  it("rejects when the user is not an admin of the account", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    const otherUserAccount = await factory.UserAccount.create();

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: userAccount.user!, account: userAccount },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation RequestAccountDeletion($input: RequestAccountDeletionInput!) {
            requestAccountDeletion(input: $input)
          }
        `,
        variables: { input: { accountId: otherUserAccount.id } },
      });

    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].extensions.code).toBe("FORBIDDEN");
  });

  it("succeeds and leaves the account intact", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: userAccount.user!, account: userAccount },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation RequestAccountDeletion($input: RequestAccountDeletionInput!) {
            requestAccountDeletion(input: $input)
          }
        `,
        variables: { input: { accountId: userAccount.id } },
      });

    expectNoGraphQLError(res);
    expect(res.body.data.requestAccountDeletion).toBe(true);

    // Account must not be deleted yet — deletion only happens on confirmation.
    const stillThere = await Account.query().findById(userAccount.id);
    expect(stillThere).toBeDefined();
    const user = await User.query().findById(userAccount.userId!);
    expect(user?.deletedAt).toBeNull();
  });
});

describe("GraphQL confirmAccountDeletion", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("requires authentication", async () => {
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      null,
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation ConfirmAccountDeletion($input: ConfirmAccountDeletionInput!) {
            confirmAccountDeletion(input: $input)
          }
        `,
        variables: { input: { token: "any-token" } },
      });

    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].extensions.code).toBe("UNAUTHENTICATED");
  });

  it("rejects an invalid token with ACCOUNT_DELETION_TOKEN_INVALID", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: userAccount.user!, account: userAccount },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation ConfirmAccountDeletion($input: ConfirmAccountDeletionInput!) {
            confirmAccountDeletion(input: $input)
          }
        `,
        variables: { input: { token: "never-issued" } },
      });

    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].extensions.argosErrorCode).toBe(
      "ACCOUNT_DELETION_TOKEN_INVALID",
    );

    // Account must remain intact when confirmation fails.
    const stillThere = await Account.query().findById(userAccount.id);
    expect(stillThere).toBeDefined();
  });

  it("rejects a token bound to a different account", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    const victimAccount = await factory.UserAccount.create();

    await seedDeletionToken({
      token: "victim-token",
      accountId: victimAccount.id,
    });

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: userAccount.user!, account: userAccount },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation ConfirmAccountDeletion($input: ConfirmAccountDeletionInput!) {
            confirmAccountDeletion(input: $input)
          }
        `,
        variables: { input: { token: "victim-token" } },
      });

    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].extensions.argosErrorCode).toBe(
      "ACCOUNT_DELETION_TOKEN_INVALID",
    );

    // Neither account should be deleted.
    const attackerStillThere = await Account.query().findById(userAccount.id);
    expect(attackerStillThere).toBeDefined();
    const victimStillThere = await Account.query().findById(victimAccount.id);
    expect(victimStillThere).toBeDefined();

    // The victim's token must remain consumable by the legitimate owner.
    expect(await getStoredDeletionToken("victim-token")).toBe(victimAccount.id);
  });

  it("deletes the account when the token is valid", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");

    await seedDeletionToken({
      token: "good-token",
      accountId: userAccount.id,
    });

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: userAccount.user!, account: userAccount },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation ConfirmAccountDeletion($input: ConfirmAccountDeletionInput!) {
            confirmAccountDeletion(input: $input)
          }
        `,
        variables: { input: { token: "good-token" } },
      });

    expectNoGraphQLError(res);
    expect(res.body.data.confirmAccountDeletion).toBe(true);

    const account = await Account.query().findById(userAccount.id);
    expect(account).toBeUndefined();
    const user = await User.query().findById(userAccount.userId!);
    expect(user?.deletedAt).not.toBeNull();
    expect(user?.email).toBeNull();

    // Token must be consumed after a successful deletion.
    expect(await getStoredDeletionToken("good-token")).toBeNull();
  });

  it("rejects reuse of an already-consumed token", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");

    await seedDeletionToken({
      token: "single-use",
      accountId: userAccount.id,
    });

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: userAccount.user!, account: userAccount },
    );

    const firstRes = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation ConfirmAccountDeletion($input: ConfirmAccountDeletionInput!) {
            confirmAccountDeletion(input: $input)
          }
        `,
        variables: { input: { token: "single-use" } },
      });
    expectNoGraphQLError(firstRes);

    const secondRes = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation ConfirmAccountDeletion($input: ConfirmAccountDeletionInput!) {
            confirmAccountDeletion(input: $input)
          }
        `,
        variables: { input: { token: "single-use" } },
      });

    expect(secondRes.body.errors).toHaveLength(1);
    expect(secondRes.body.errors[0].extensions.argosErrorCode).toBe(
      "ACCOUNT_DELETION_TOKEN_INVALID",
    );
  });

  it("rejects a token when the authenticated context is a team", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    const teamAccount = await factory.TeamAccount.create();
    await factory.TeamUser.create({
      teamId: teamAccount.teamId!,
      userId: userAccount.userId!,
      userLevel: "owner",
    });

    await seedDeletionToken({
      token: "team-context",
      accountId: userAccount.id,
    });

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: userAccount.user!, account: teamAccount },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation ConfirmAccountDeletion($input: ConfirmAccountDeletionInput!) {
            confirmAccountDeletion(input: $input)
          }
        `,
        variables: { input: { token: "team-context" } },
      });

    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].extensions.code).toBe("FORBIDDEN");
  });
});
