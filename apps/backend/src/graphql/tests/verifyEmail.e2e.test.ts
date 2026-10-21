import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { describe, expect, test } from "vitest";

import { type Account, type User, UserEmail } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { getRedisClient } from "@/util/redis/client";
import { setupRedis } from "@/util/redis/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const EMAIL = "jane@acme.com";
const LINK_KEY_PREFIX = "email_verification_link:";

type Viewer = { account: Account; user: User };

async function createViewer(): Promise<Viewer> {
  const account = await factory.UserAccount.create();
  await account.$fetchGraph("user");
  invariant(account.user, "user not fetched");
  return { account, user: account.user };
}

const withUsers = test.extend<{ jane: Viewer; mallory: Viewer }>({
  jane: async ({}, use) => {
    await setupDatabase();
    await use(await createViewer());
  },
  mallory: async ({ jane: _jane }, use) => {
    await use(await createViewer());
  },
});

async function sendGraphQL(
  viewer: Viewer | null,
  query: string,
  variables: Record<string, unknown>,
) {
  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    viewer,
  );
  const res = await request(app).post("/graphql").send({ query, variables });
  expectNoGraphQLError(res);
  return res.body.data;
}

async function addUserEmail(viewer: Viewer) {
  await sendGraphQL(
    viewer,
    `mutation AddUserEmail($email: String!) {
      addUserEmail(email: $email) { id }
    }`,
    { email: EMAIL },
  );
}

async function verifyEmail(token: string) {
  const data = await sendGraphQL(
    null,
    `mutation VerifyEmail($email: String!, $token: String!) {
      verifyEmail(email: $email, token: $token)
    }`,
    { email: EMAIL, token },
  );
  return data.verifyEmail;
}

/**
 * Token of the only verification link sent so far. Emails are not sent in
 * tests, so it is read from where the link is stored.
 */
async function getSentToken() {
  const redis = await getRedisClient();
  const [key, ...others] = await redis.keys(`${LINK_KEY_PREFIX}*`);
  invariant(key && others.length === 0, "expected one verification link");
  return key.slice(LINK_KEY_PREFIX.length);
}

describe("verifyEmail", () => {
  setupRedis();

  withUsers(
    "verifies the email for the user who requested the link",
    async ({ jane }) => {
      await addUserEmail(jane);

      expect(await verifyEmail(await getSentToken())).toBe(true);
      expect(await UserEmail.query().findById(EMAIL)).toMatchObject({
        userId: jane.user.id,
        verified: true,
      });
    },
  );

  withUsers(
    "does not verify the email for a user who took it over after the link was sent",
    async ({ jane, mallory }) => {
      await addUserEmail(jane);
      const janeToken = await getSentToken();
      await addUserEmail(mallory);

      expect(await verifyEmail(janeToken)).toBe(false);
      expect(await UserEmail.query().findById(EMAIL)).toMatchObject({
        userId: mallory.user.id,
        verified: false,
      });
    },
  );
});
