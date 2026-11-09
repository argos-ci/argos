import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { getAuthPayloadFromUserAccessToken } from "@/auth/user-access-token";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

describe("GraphQL createUserAccessToken", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("returns a token that authenticates the user on the picked accounts", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    invariant(userAccount.user);

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: userAccount.user,
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
    expect(res.body.data.createUserAccessToken.accessToken.source).toBe("user");

    const auth = await getAuthPayloadFromUserAccessToken(
      res.body.data.createUserAccessToken.token,
    );
    expect(auth.user.id).toBe(userAccount.user.id);
    expect(auth.scope.map((account) => account.id)).toEqual([userAccount.id]);
  });
});
