import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { UserPasskey } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const PASSKEYS_QUERY = `
  query Passkeys {
    me {
      id
      passkeys {
        id
        name
      }
    }
  }
`;

describe("GraphQL User.passkeys", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("returns a stable order for passkeys created in the same tick", async () => {
    const userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    const { user } = userAccount;
    invariant(user, "user not fetched");

    // One insert, so `$beforeInsert` stamps both rows with the same
    // millisecond `createdAt` — the tie that made the order arbitrary.
    const created = await UserPasskey.query().insertAndFetch(
      ["older", "newer"].map((name, index) => ({
        userId: user.id,
        credentialId: `order-${index}`,
        publicKey: `key-${index}`,
        counter: "0",
        transports: null,
        deviceType: "multiDevice" as const,
        backedUp: true,
        aaguid: null,
        name,
        lastUsedAt: null,
      })),
    );
    expect(String(created[0]?.createdAt)).toBe(String(created[1]?.createdAt));

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account: userAccount },
    );

    // Repeated because an unstable sort can agree with the expected order by
    // chance; a tiebreaker has to hold every time.
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await request(app).post("/graphql").send({
        query: PASSKEYS_QUERY,
      });
      expectNoGraphQLError(res);
      expect(
        res.body.data.me.passkeys.map((p: { name: string }) => p.name),
      ).toEqual(["newer", "older"]);
    }
  });
});
