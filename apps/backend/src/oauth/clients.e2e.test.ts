import { test as base, describe, expect } from "vitest";

import { OAuthClient, OAuthGrant, type User } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { createDynamicClient, purgeAbandonedClients } from "./clients";

const NOW = new Date("2026-06-02T12:00:00.000Z");
const TWO_DAYS_AGO = "2026-05-31T12:00:00.000Z";
const AN_HOUR_AGO = "2026-06-02T11:00:00.000Z";

/** A client registered through Dynamic Client Registration at `createdAt`. */
async function registerClient(createdAt: string) {
  const { client } = await createDynamicClient({
    clientName: "Some MCP client",
    redirectUris: ["https://mcp-client.example/callback"],
  });
  return OAuthClient.query().patchAndFetchById(client.id, { createdAt });
}

async function exists(client: OAuthClient) {
  return (await OAuthClient.query().findById(client.id)) !== undefined;
}

const test = base.extend<{ user: User }>({
  user: async ({}, use) => {
    await setupDatabase();
    await use(await factory.User.create());
  },
});

/**
 * Grants cascade off their client, so a client purged by mistake takes every
 * connection made through it down at once, with nothing left to restore.
 */
describe("purgeAbandonedClients", () => {
  test("deletes a registration nobody authorized within a day", async ({
    user: _user,
  }) => {
    const client = await registerClient(TWO_DAYS_AGO);

    await expect(purgeAbandonedClients(NOW)).resolves.toBe(1);
    expect(await exists(client)).toBe(false);
  });

  test("keeps a client someone authorized, even once revoked", async ({
    user,
  }) => {
    const client = await registerClient(TWO_DAYS_AGO);
    await OAuthGrant.query().insert({
      userId: user.id,
      oauthClientId: client.id,
      scopes: ["profile"],
      lastUsedAt: null,
      revokedAt: AN_HOUR_AGO,
    });

    await expect(purgeAbandonedClients(NOW)).resolves.toBe(0);
    expect(await exists(client)).toBe(true);
  });

  test("gives a new registration its day", async ({ user: _user }) => {
    const client = await registerClient(AN_HOUR_AGO);

    await expect(purgeAbandonedClients(NOW)).resolves.toBe(0);
    expect(await exists(client)).toBe(true);
  });

  // First-party clients are seeded, not registered: one nobody has used yet is
  // still the product's own.
  test("never deletes a first-party client", async ({ user: _user }) => {
    const client = await registerClient(TWO_DAYS_AGO);
    await client.$query().patch({ isFirstParty: true });

    await expect(purgeAbandonedClients(NOW)).resolves.toBe(0);
    expect(await exists(client)).toBe(true);
  });
});
