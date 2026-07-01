import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import type { Account, User } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const QUERY = `
  query UserGhInstallations {
    me {
      id
      ghInstallations {
        pageInfo {
          totalCount
        }
      }
    }
  }
`;

async function queryGhInstallations(input: { user: User; account: Account }) {
  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    {
      user: input.user,
      account: input.account,
    },
  );
  const result = await request(app).post("/graphql").send({ query: QUERY });
  expectNoGraphQLError(result);
  expect(result.status).toBe(200);
  return result.body.data.me.ghInstallations;
}

describe("GraphQL User.ghInstallations", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("is null when the account has no linked GitHub account", async () => {
    const user = await factory.User.create();
    const account = await factory.UserAccount.create({
      userId: user.id,
      githubAccountId: null,
    });
    await expect(queryGhInstallations({ user, account })).resolves.toBeNull();
  });

  it("is null when the linked GitHub account has no access token", async () => {
    const user = await factory.User.create();
    const githubAccount = await factory.GithubAccount.create({
      accessToken: null,
    });
    const account = await factory.UserAccount.create({
      userId: user.id,
      githubAccountId: githubAccount.id,
    });
    await expect(queryGhInstallations({ user, account })).resolves.toBeNull();
  });
});
