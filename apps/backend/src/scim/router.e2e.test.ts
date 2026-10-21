import { invariant } from "@argos/util/invariant";
import express from "express";
import request from "supertest";
import { afterEach, test as base, describe, expect } from "vitest";

import config from "@/config";
import {
  Account,
  Plan,
  Subscription,
  Team,
  TeamScimUser,
  TeamUser,
  User,
  UserEmail,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { getRedisClient } from "@/util/redis/client";

import router from "./router";
import { generateTeamScimToken } from "./service";

const app = express();
app.use("/scim/v2", router);

const SCIM_JSON = "application/scim+json";

const test = base.extend<{
  owner: User;
  ownerEmail: string;
  teamAccount: Account;
  token: string;
}>({
  owner: async ({}, use) => {
    await setupDatabase();
    const owner = await factory.User.create();
    await factory.UserAccount.create({ userId: owner.id });
    await use(owner);
  },
  ownerEmail: async ({ owner }, use) => {
    const { email } = await factory.UserEmail.create({
      userId: owner.id,
      email: "owner@acme.com",
      verified: true,
    });
    await use(email);
  },
  teamAccount: async ({ owner }, use) => {
    const teamAccount = await factory.TeamAccount.create();
    invariant(teamAccount.teamId);
    await factory.TeamUser.create({
      teamId: teamAccount.teamId,
      userId: owner.id,
      userLevel: "owner",
    });
    const plan = await factory.Plan.create({ samlIncluded: true });
    await factory.Subscription.create({
      accountId: teamAccount.id,
      planId: plan.id,
      status: "active",
      endDate: null,
    });
    await use(teamAccount);
  },
  token: async ({ owner, teamAccount }, use) => {
    await use(
      await generateTeamScimToken({ account: teamAccount, user: owner }),
    );
  },
});

function scim(token: string) {
  const auth = (req: request.Test) =>
    req.set("Authorization", `Bearer ${token}`).set("Content-Type", SCIM_JSON);
  return {
    get: (path: string) => auth(request(app).get(`/scim/v2${path}`)),
    post: (path: string, body: object) =>
      auth(request(app).post(`/scim/v2${path}`)).send(body),
    put: (path: string, body: object) =>
      auth(request(app).put(`/scim/v2${path}`)).send(body),
    patch: (path: string, body: object) =>
      auth(request(app).patch(`/scim/v2${path}`)).send(body),
    delete: (path: string) => auth(request(app).delete(`/scim/v2${path}`)),
  };
}

function patchOp(operations: object[]) {
  return {
    schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
    Operations: operations,
  };
}

function oktaUser(email: string, overrides?: object) {
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    userName: email,
    name: { givenName: "Jane", familyName: "Doe" },
    emails: [{ primary: true, value: email, type: "work" }],
    displayName: "Jane Doe",
    active: true,
    ...overrides,
  };
}

async function getMembership(teamAccount: Account, email: string) {
  const userEmail = await UserEmail.query().findById(email);
  if (!userEmail) {
    return null;
  }
  const teamUser = await TeamUser.query().findOne({
    teamId: teamAccount.teamId,
    userId: userEmail.userId,
  });
  return teamUser ?? null;
}

describe("SCIM API", () => {
  describe("authentication", () => {
    test("rejects a request without a token", async () => {
      await setupDatabase();
      const res = await request(app).get("/scim/v2/Users");
      expect(res.status).toBe(401);
      expect(res.headers["content-type"]).toContain(SCIM_JSON);
      expect(res.body).toEqual({
        schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
        status: "401",
        detail: "A bearer token is required.",
      });
    });

    test("rejects an unknown token", async () => {
      await setupDatabase();
      const res = await scim(`argos_scim_${"x".repeat(40)}`).get("/Users");
      expect(res.status).toBe(401);
      expect(res.body.detail).toBe("Invalid SCIM token.");
    });

    test("rejects a team that lost access to SAML SSO", async ({
      token,
      teamAccount,
    }) => {
      await Plan.query()
        .patch({ samlIncluded: false })
        .whereIn(
          "id",
          Subscription.query()
            .select("planId")
            .where("accountId", teamAccount.id),
        );
      const res = await scim(token).get("/Users");
      expect(res.status).toBe(403);
    });

    test("only sees the users of its own team", async ({ token }) => {
      const otherTeam = await factory.TeamAccount.create();
      invariant(otherTeam.teamId);
      const user = await factory.User.create();
      const otherScimUser = await TeamScimUser.query().insert({
        teamId: otherTeam.teamId,
        userId: user.id,
        userName: "jane@other.com",
        active: true,
      });

      const res = await scim(token).get(`/Users/${otherScimUser.id}`);
      expect(res.status).toBe(404);
      const list = await scim(token).get(
        `/Users?filter=${encodeURIComponent('userName eq "jane@other.com"')}`,
      );
      expect(list.body.totalResults).toBe(0);
    });
  });

  test("provisions and deprovisions a user like Okta", async ({
    token,
    teamAccount,
  }) => {
    const api = scim(token);
    const filter = encodeURIComponent('userName eq "jane@acme.com"');

    // Okta looks the user up before creating it.
    const lookup = await api.get(
      `/Users?filter=${filter}&startIndex=1&count=100`,
    );
    expect(lookup.status).toBe(200);
    expect(lookup.body).toMatchObject({ totalResults: 0, Resources: [] });

    const created = await api.post("/Users", oktaUser("jane@acme.com"));
    expect(created.status).toBe(201);
    expect(created.headers["content-type"]).toContain(SCIM_JSON);
    expect(created.headers["location"]).toBe(created.body.meta.location);
    expect(created.body).toMatchObject({
      userName: "jane@acme.com",
      name: { givenName: "Jane", familyName: "Doe" },
      emails: [{ value: "jane@acme.com", primary: true }],
      active: true,
    });
    const { id } = created.body;

    // A new Argos account, with the email verified, joined the team.
    const userEmail = await UserEmail.query().findById("jane@acme.com");
    expect(userEmail?.verified).toBe(true);
    invariant(teamAccount.teamId);
    const team = await Team.query()
      .findById(teamAccount.teamId)
      .throwIfNotFound();
    expect(await getMembership(teamAccount, "jane@acme.com")).toMatchObject({
      userLevel: team.defaultUserLevel,
    });

    const found = await api.get(`/Users?filter=${filter}`);
    expect(found.body).toMatchObject({
      totalResults: 1,
      Resources: [{ id, userName: "jane@acme.com" }],
    });

    // Okta updates the profile with a PUT.
    const updated = await api.put(
      `/Users/${id}`,
      oktaUser("jane@acme.com", { name: { givenName: "Janet" } }),
    );
    expect(updated.status).toBe(200);
    expect(updated.body.name).toEqual({
      givenName: "Janet",
      formatted: "Janet",
    });

    // Unassigning the app deactivates the user, which removes the member.
    const deactivated = await api.patch(
      `/Users/${id}`,
      patchOp([{ op: "replace", value: { active: false } }]),
    );
    expect(deactivated.status).toBe(200);
    expect(deactivated.body.active).toBe(false);
    expect(await getMembership(teamAccount, "jane@acme.com")).toBeNull();
    // The account stays.
    expect(await UserEmail.query().findById("jane@acme.com")).toBeDefined();

    // Still known to the IdP, which reactivates it by the same id.
    const fetched = await api.get(`/Users/${id}`);
    expect(fetched.body).toMatchObject({ id, active: false });

    const reactivated = await api.patch(
      `/Users/${id}`,
      patchOp([{ op: "replace", value: { active: true } }]),
    );
    expect(reactivated.body.active).toBe(true);
    expect(await getMembership(teamAccount, "jane@acme.com")).not.toBeNull();
  });

  test("provisions and deprovisions a user like Entra ID", async ({
    token,
    teamAccount,
  }) => {
    const api = scim(token);

    // Entra ID checks the connection with a random userName.
    const probe = await api.get(
      `/Users?filter=${encodeURIComponent('userName eq "4a6d5f6c-7a0e-4c64-9f5e-0b1ad0c8a1e2"')}`,
    );
    expect(probe.status).toBe(200);
    expect(probe.body.totalResults).toBe(0);

    const created = await api.post("/Users", {
      schemas: [
        "urn:ietf:params:scim:schemas:core:2.0:User",
        "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User",
      ],
      externalId: "jdoe",
      userName: "jdoe@acme.onmicrosoft.com",
      active: true,
      displayName: "Jane Doe",
      emails: [{ primary: true, type: "work", value: "jane@acme.com" }],
      name: { formatted: "Jane Doe", familyName: "Doe", givenName: "Jane" },
      "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": {
        department: "R&D",
      },
    });
    expect(created.status).toBe(201);
    const { id } = created.body;
    // Linked on the email, which is what SAML logins match on.
    expect(await getMembership(teamAccount, "jane@acme.com")).not.toBeNull();

    const byExternalId = await api.get(
      `/Users?filter=${encodeURIComponent('externalId eq "jdoe"')}`,
    );
    expect(byExternalId.body.Resources).toMatchObject([{ id }]);

    const deactivated = await api.patch(
      `/Users/${id}`,
      patchOp([
        { op: "Replace", path: "active", value: "False" },
        {
          op: "Add",
          path: 'emails[type eq "work"].value',
          value: "jane.doe@acme.com",
        },
      ]),
    );
    expect(deactivated.status).toBe(200);
    expect(deactivated.body).toMatchObject({
      active: false,
      emails: [{ value: "jane.doe@acme.com" }],
    });
    expect(await getMembership(teamAccount, "jane@acme.com")).toBeNull();

    const deleted = await api.delete(`/Users/${id}`);
    expect(deleted.status).toBe(204);
    expect((await api.get(`/Users/${id}`)).status).toBe(404);
  });

  test("links an existing member without changing their level", async ({
    token,
    teamAccount,
    owner,
    ownerEmail,
  }) => {
    const created = await scim(token).post("/Users", oktaUser(ownerEmail));
    expect(created.status).toBe(201);

    expect(await User.query().resultSize()).toBe(1);
    expect(await getMembership(teamAccount, ownerEmail)).toMatchObject({
      userId: owner.id,
      userLevel: "owner",
    });
  });

  test("does not link a user on an unverified email", async ({
    token,
    teamAccount,
  }) => {
    // Anyone can add an address to their account without owning it.
    const squatter = await factory.User.create();
    await factory.UserEmail.create({
      userId: squatter.id,
      email: "jane@acme.com",
      verified: false,
    });

    const created = await scim(token).post("/Users", oktaUser("jane@acme.com"));
    expect(created.status).toBe(201);

    const membership = await getMembership(teamAccount, "jane@acme.com");
    expect(membership).not.toBeNull();
    expect(membership?.userId).not.toBe(squatter.id);
    expect(
      await TeamUser.query().findOne({
        teamId: teamAccount.teamId,
        userId: squatter.id,
      }),
    ).toBeUndefined();
  });

  test("refuses to provision the same userName twice", async ({ token }) => {
    const api = scim(token);
    expect((await api.post("/Users", oktaUser("jane@acme.com"))).status).toBe(
      201,
    );

    const duplicate = await api.post("/Users", oktaUser("JANE@acme.com"));
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.scimType).toBe("uniqueness");
  });

  test("keeps the last member of the team", async ({
    token,
    teamAccount,
    ownerEmail,
  }) => {
    const api = scim(token);
    const created = await api.post("/Users", oktaUser(ownerEmail));

    const res = await api.patch(
      `/Users/${created.body.id}`,
      patchOp([{ op: "replace", path: "active", value: false }]),
    );
    expect(res.status).toBe(403);
    expect(res.body.detail).toBe("Can't remove the last user of a team.");
    // Nothing changed: the IdP sees the user as still active.
    expect((await api.get(`/Users/${created.body.id}`)).body.active).toBe(true);
    expect(await getMembership(teamAccount, ownerEmail)).not.toBeNull();
  });

  test("sets the member's level from their role", async ({
    token,
    teamAccount,
  }) => {
    const api = scim(token);
    const created = await api.post(
      "/Users",
      oktaUser("jane@acme.com", {
        roles: [{ value: "contributor", primary: true }],
      }),
    );
    expect(created.status).toBe(201);
    expect(created.body.roles).toEqual([
      { value: "contributor", primary: true },
    ]);
    expect(await getMembership(teamAccount, "jane@acme.com")).toMatchObject({
      userLevel: "contributor",
    });

    // Entra ID assigns app roles this way.
    const promoted = await api.patch(
      `/Users/${created.body.id}`,
      patchOp([
        {
          op: "Replace",
          path: 'roles[primary eq "True"].value',
          value: "Owner",
        },
      ]),
    );
    expect(promoted.status).toBe(200);
    expect(await getMembership(teamAccount, "jane@acme.com")).toMatchObject({
      userLevel: "owner",
    });

    // Without a role, the level is left as it is.
    await api.patch(
      `/Users/${created.body.id}`,
      patchOp([{ op: "Remove", path: "roles" }]),
    );
    expect(await getMembership(teamAccount, "jane@acme.com")).toMatchObject({
      userLevel: "owner",
    });
  });

  test("never takes the owner role from the last owner", async ({
    token,
    teamAccount,
    ownerEmail,
  }) => {
    const api = scim(token);
    const { body: ownerUser } = await api.post("/Users", oktaUser(ownerEmail));
    const demote = () =>
      api.patch(
        `/Users/${ownerUser.id}`,
        patchOp([{ op: "replace", path: "roles", value: ["member"] }]),
      );

    // Skipped, without failing the rest of the update.
    expect((await demote()).status).toBe(200);
    expect(await getMembership(teamAccount, ownerEmail)).toMatchObject({
      userLevel: "owner",
    });

    // With another owner, the next role change goes through.
    await api.post("/Users", oktaUser("jane@acme.com", { roles: ["owner"] }));
    await api.patch(
      `/Users/${ownerUser.id}`,
      patchOp([{ op: "replace", path: "roles", value: ["contributor"] }]),
    );
    expect(await getMembership(teamAccount, ownerEmail)).toMatchObject({
      userLevel: "contributor",
    });
  });

  test("deprovisions the last owner while other members remain", async ({
    token,
    teamAccount,
    ownerEmail,
  }) => {
    const api = scim(token);
    const { body: ownerUser } = await api.post("/Users", oktaUser(ownerEmail));
    await api.post("/Users", oktaUser("jane@acme.com"));
    await api.post("/Users", oktaUser("fox@acme.com"));

    // Offboarding wins: the team is left without an owner, and Argos is told.
    const res = await api.patch(
      `/Users/${ownerUser.id}`,
      patchOp([{ op: "replace", path: "active", value: false }]),
    );
    expect(res.status).toBe(200);
    expect(await getMembership(teamAccount, ownerEmail)).toBeNull();
    expect(
      await TeamUser.query()
        .where({ teamId: teamAccount.teamId, userLevel: "owner" })
        .resultSize(),
    ).toBe(0);
  });

  test("serves the discovery endpoints without a token", async () => {
    for (const path of [
      "/ServiceProviderConfig",
      "/ResourceTypes",
      "/Schemas",
    ]) {
      const res = await request(app).get(`/scim/v2${path}`);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain(SCIM_JSON);
    }
  });

  describe("rate limiting", () => {
    const { limit, scimLimit } = config.get("api.rateLimit");

    afterEach(() => {
      config.set("api.rateLimit.limit", limit);
      config.set("api.rateLimit.scimLimit", scimLimit);
    });

    // Counted in Redis, which the database truncation between tests leaves.
    async function resetRateLimits() {
      const redis = await getRedisClient();
      const keys = await redis.keys("rl:scim*");
      if (keys.length > 0) {
        await redis.del(keys);
      }
    }

    test("budgets each team apart", async ({ token, owner }) => {
      await resetRateLimits();
      config.set("api.rateLimit.scimLimit", 1);
      expect((await scim(token).get("/Users")).status).toBe(200);
      const limited = await scim(token).get("/Users");
      expect(limited.status).toBe(429);
      expect(limited.body).toMatchObject({
        schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
        status: "429",
      });

      const otherTeam = await factory.TeamAccount.create();
      invariant(otherTeam.teamId);
      await factory.TeamUser.create({
        teamId: otherTeam.teamId,
        userId: owner.id,
        userLevel: "owner",
      });
      await factory.Subscription.create({
        accountId: otherTeam.id,
        planId: (await factory.Plan.create({ samlIncluded: true })).id,
        status: "active",
        endDate: null,
      });
      const otherToken = await generateTeamScimToken({
        account: otherTeam,
        user: owner,
      });
      expect((await scim(otherToken).get("/Users")).status).toBe(200);
    });

    test("stops a client guessing tokens", async () => {
      await setupDatabase();
      await resetRateLimits();
      config.set("api.rateLimit.limit", 1);
      const guess = () => scim(`argos_scim_${"x".repeat(40)}`).get("/Users");
      expect((await guess()).status).toBe(401);
      expect((await guess()).status).toBe(429);
    });
  });
});
