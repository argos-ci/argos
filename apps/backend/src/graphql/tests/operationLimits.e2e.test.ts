import { createServer } from "node:http";
import { invariant } from "@argos/util/invariant";
import { createClient } from "graphql-ws";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import WebSocket from "ws";

import { UserAccessToken } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { createGraphQLWebSocketServer } from "../ws";
import { createApolloServerApp } from "./util";

describe("GraphQL operation limits", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("refuses aliased mutations before running any of them", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    invariant(userAccount.user);

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: userAccount.user, account: userAccount },
    );

    const mutations = Array.from(
      { length: 50 },
      (_, i) => `token${i}: createUserAccessToken(input: $input) { token }`,
    );
    const res = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation CreateTokens($input: CreateUserAccessTokenInput!) {
            ${mutations.join("\n")}
          }
        `,
        variables: {
          input: { name: "User token", accountIds: [userAccount.id] },
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.data).toBeUndefined();
    expect(res.body.errors).toEqual([
      expect.objectContaining({
        message:
          "This operation has more than one mutation. Send each mutation in its own request.",
        extensions: expect.objectContaining({
          code: "OPERATION_LIMIT_EXCEEDED",
        }),
      }),
    ]);
    expect(await UserAccessToken.query().resultSize()).toBe(0);
  });

  it("refuses mutations over WebSocket", async () => {
    const server = createServer();
    createGraphQLWebSocketServer(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    invariant(address && typeof address === "object");

    const client = createClient({
      url: `ws://localhost:${address.port}/graphql`,
      webSocketImpl: WebSocket,
      retryAttempts: 0,
    });

    try {
      const error = await new Promise((resolve, reject) => {
        client.subscribe(
          { query: "mutation { ping }" },
          {
            next: () =>
              reject(new Error("Expected the mutation to be refused")),
            error: resolve,
            complete: () =>
              reject(new Error("Expected the mutation to be refused")),
          },
        );
      });

      expect(error).toEqual([
        expect.objectContaining({
          message:
            "Only subscriptions run over WebSocket. Send queries and mutations over HTTP.",
          extensions: { code: "OPERATION_LIMIT_EXCEEDED" },
        }),
      ]);
    } finally {
      await client.dispose();
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
