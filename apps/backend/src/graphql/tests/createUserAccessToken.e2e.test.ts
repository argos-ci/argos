import { createHash } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { exchangeCliAuthCode } from "@/auth/cli";
import { UserAccessToken } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

describe("GraphQL createUserAccessToken", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("rejects a codeChallenge for user tokens", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: userAccount.user!,
        account: userAccount,
      },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation CreateUserAccessToken($input: CreateUserAccessTokenInput!) {
            createUserAccessToken(input: $input) {
              token
              code
            }
          }
        `,
        variables: {
          input: {
            name: "User token",
            accountIds: [userAccount.id],
            source: "user",
            codeChallenge: "challenge",
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toBe(
      "codeChallenge is only supported for CLI tokens",
    );
    expect(await UserAccessToken.query()).toHaveLength(0);
  });

  it("rejects a codeChallenge when source defaults to user", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: userAccount.user!,
        account: userAccount,
      },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation CreateUserAccessToken($input: CreateUserAccessTokenInput!) {
            createUserAccessToken(input: $input) {
              token
              code
            }
          }
        `,
        variables: {
          input: {
            name: "User token",
            accountIds: [userAccount.id],
            codeChallenge: "challenge",
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toBe(
      "codeChallenge is only supported for CLI tokens",
    );
    expect(await UserAccessToken.query()).toHaveLength(0);
  });

  it("creates a user token without a codeChallenge", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: userAccount.user!,
        account: userAccount,
      },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation CreateUserAccessToken($input: CreateUserAccessTokenInput!) {
            createUserAccessToken(input: $input) {
              token
              code
              accessToken {
                source
              }
            }
          }
        `,
        variables: {
          input: {
            name: "User token",
            accountIds: [userAccount.id],
          },
        },
      });

    expectNoGraphQLError(res);
    expect(res.status).toBe(200);
    expect(res.body.data.createUserAccessToken.token).toMatch(/^arp_/);
    expect(res.body.data.createUserAccessToken.code).toBeNull();
    expect(res.body.data.createUserAccessToken.accessToken.source).toBe("user");
  });

  it("rejects a CLI token without a codeChallenge", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: userAccount.user!,
        account: userAccount,
      },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation CreateUserAccessToken($input: CreateUserAccessTokenInput!) {
            createUserAccessToken(input: $input) {
              token
              code
            }
          }
        `,
        variables: {
          input: {
            name: "CLI token",
            accountIds: [userAccount.id],
            source: "cli",
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toBe(
      "codeChallenge is required for CLI tokens",
    );
    expect(await UserAccessToken.query()).toHaveLength(0);
  });

  it("creates a CLI token with a codeChallenge", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: userAccount.user!,
        account: userAccount,
      },
    );
    const codeVerifier = "cli-code-verifier";
    const codeChallenge = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    const res = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation CreateUserAccessToken($input: CreateUserAccessTokenInput!) {
            createUserAccessToken(input: $input) {
              token
              code
              accessToken {
                source
              }
            }
          }
        `,
        variables: {
          input: {
            name: "CLI token",
            accountIds: [userAccount.id],
            source: "cli",
            codeChallenge,
          },
        },
      });

    expectNoGraphQLError(res);
    expect(res.status).toBe(200);
    expect(res.body.data.createUserAccessToken.token).toBe("");
    expect(res.body.data.createUserAccessToken.code).toMatch(/^[a-z0-9]{40}$/);
    expect(res.body.data.createUserAccessToken.accessToken.source).toBe("cli");

    const token = await exchangeCliAuthCode(
      res.body.data.createUserAccessToken.code,
      codeVerifier,
    );
    expect(token).toMatch(/^arp_/);
  });
});
