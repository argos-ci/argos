import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { Account } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const TeamContactQuery = `
  query TeamContact($days: Int!) {
    staffTeamCohort(days: $days) {
      id
      staffOwners {
        id
        name
        email
      }
      staffContactedAt
    }
  }
`;

const SetContactMutation = `
  mutation SetTeamStaffContact($teamAccountId: ID!, $contacted: Boolean!) {
    setTeamStaffContact(
      input: { teamAccountId: $teamAccountId, contacted: $contacted }
    ) {
      id
      staffContactedAt
    }
  }
`;

async function createViewer(options: { staff: boolean }) {
  const userAccount = await factory.UserAccount.create();
  await userAccount.$fetchGraph("user");
  invariant(userAccount.user, "user not fetched");
  await userAccount.user.$query().patch({ staff: options.staff });
  await userAccount.$fetchGraph("user");
  invariant(userAccount.user, "user not fetched");

  return { userAccount, user: userAccount.user };
}

/** A team with `count` owners, each with a name and an email address. */
async function createTeamWithOwners(count: number) {
  const teamAccount = await factory.TeamAccount.create();
  invariant(teamAccount.teamId, "team account has no team");

  const owners = [];
  for (let index = 0; index < count; index++) {
    const ownerAccount = await factory.UserAccount.create({
      name: `Owner ${index}`,
    });
    invariant(ownerAccount.userId, "account has no user");
    await factory.TeamUser.create({
      teamId: teamAccount.teamId,
      userId: ownerAccount.userId,
      userLevel: "owner",
    });
    owners.push(ownerAccount);
  }

  return { teamAccount, owners };
}

async function createApp(auth: Awaited<ReturnType<typeof createViewer>>) {
  return createApolloServerApp(apolloServer, createApolloMiddleware, {
    user: auth.user,
    account: auth.userAccount,
  });
}

function findTeam(res: request.Response, teamId: string) {
  const entry = res.body.data.staffTeamCohort.find(
    (team: { id: string }) => team.id === teamId,
  );
  invariant(entry, `team ${teamId} missing from the cohort`);
  return entry;
}

describe("GraphQL staff team contact", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("lists every owner with their address", async () => {
    const viewer = await createViewer({ staff: true });
    const { teamAccount } = await createTeamWithOwners(2);
    const app = await createApp(viewer);

    const res = await request(app)
      .post("/graphql")
      .send({ query: TeamContactQuery, variables: { days: 30 } });

    expectNoGraphQLError(res);
    const entry = findTeam(res, teamAccount.id);
    expect(entry.staffOwners).toHaveLength(2);
    expect(entry.staffOwners[0].email).toEqual(expect.stringContaining("@"));
    expect(
      entry.staffOwners.map((owner: { name: string }) => owner.name),
    ).toEqual(expect.arrayContaining(["Owner 0", "Owner 1"]));
    // Never contacted yet.
    expect(entry.staffContactedAt).toBeNull();
  });

  it("refuses to expose owner addresses to non-staff users", async () => {
    const viewer = await createViewer({ staff: false });
    await createTeamWithOwners(1);
    const app = await createApp(viewer);

    const res = await request(app)
      .post("/graphql")
      .send({ query: TeamContactQuery, variables: { days: 30 } });

    // Owner emails are personal data — the cohort itself is staff-gated, but
    // the field must refuse on its own too.
    expect(res.body.errors[0].extensions.code).toBe("FORBIDDEN");
  });

  it("records who reached out, then clears it", async () => {
    const viewer = await createViewer({ staff: true });
    const { teamAccount } = await createTeamWithOwners(1);
    const app = await createApp(viewer);

    const marked = await request(app)
      .post("/graphql")
      .send({
        query: SetContactMutation,
        variables: { teamAccountId: teamAccount.id, contacted: true },
      });

    expectNoGraphQLError(marked);
    expect(
      marked.body.data.setTeamStaffContact.staffContactedAt,
    ).not.toBeNull();

    const cleared = await request(app)
      .post("/graphql")
      .send({
        query: SetContactMutation,
        variables: { teamAccountId: teamAccount.id, contacted: false },
      });

    expectNoGraphQLError(cleared);
    expect(cleared.body.data.setTeamStaffContact.staffContactedAt).toBeNull();
  });

  it("stays marked when clicked twice", async () => {
    const viewer = await createViewer({ staff: true });
    const { teamAccount } = await createTeamWithOwners(1);
    const app = await createApp(viewer);

    for (let index = 0; index < 2; index++) {
      const res = await request(app)
        .post("/graphql")
        .send({
          query: SetContactMutation,
          variables: { teamAccountId: teamAccount.id, contacted: true },
        });
      expectNoGraphQLError(res);
    }

    const account = await Account.query().findById(teamAccount.id);
    expect(account?.staffContactedAt).not.toBeNull();
  });

  it("refuses to let a non-staff user mark a team", async () => {
    const viewer = await createViewer({ staff: false });
    const { teamAccount } = await createTeamWithOwners(1);
    const app = await createApp(viewer);

    const res = await request(app)
      .post("/graphql")
      .send({
        query: SetContactMutation,
        variables: { teamAccountId: teamAccount.id, contacted: true },
      });

    expect(res.body.errors[0].extensions.code).toBe("FORBIDDEN");
  });
});
