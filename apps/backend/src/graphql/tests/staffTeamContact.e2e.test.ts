import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { StaffTeamContact } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const TeamContactQuery = `
  query TeamContact($days: Int!) {
    staffTrialPipeline(days: $days) {
      id
      staff {
        owners {
          id
          name
          email
        }
        contact {
          id
          date
          user {
            id
          }
        }
      }
    }
  }
`;

const SetContactMutation = `
  mutation SetTeamStaffContact($teamAccountId: ID!, $contacted: Boolean!) {
    setTeamStaffContact(
      input: { teamAccountId: $teamAccountId, contacted: $contacted }
    ) {
      id
      staff {
        contact {
          id
          user {
            id
          }
        }
      }
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
  const entry = res.body.data.staffTrialPipeline.find(
    (team: { id: string }) => team.id === teamId,
  );
  invariant(entry, `team ${teamId} missing from the pipeline`);
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
    expect(entry.staff.owners).toHaveLength(2);
    expect(entry.staff.owners[0].email).toEqual(expect.stringContaining("@"));
    expect(
      entry.staff.owners.map((owner: { name: string }) => owner.name),
    ).toEqual(expect.arrayContaining(["Owner 0", "Owner 1"]));
    // Never contacted yet.
    expect(entry.staff.contact).toBeNull();
  });

  it("hides the whole staff block from non-staff users", async () => {
    const viewer = await createViewer({ staff: false });
    await createTeamWithOwners(1);
    const app = await createApp(viewer);

    const res = await request(app)
      .post("/graphql")
      .send({ query: TeamContactQuery, variables: { days: 30 } });

    // The pipeline query is staff-gated, so this one errors before reaching
    // the field. `Team.staff` returning null on its own is covered below.
    expect(res.body.errors[0].extensions.code).toBe("FORBIDDEN");
  });

  it("withholds the staff block from a team's own member", async () => {
    const viewer = await createViewer({ staff: false });
    const { teamAccount } = await createTeamWithOwners(1);
    invariant(teamAccount.teamId, "team account has no team");
    invariant(viewer.userAccount.userId, "account has no user");
    await factory.TeamUser.create({
      teamId: teamAccount.teamId,
      userId: viewer.userAccount.userId,
      userLevel: "owner",
    });
    const app = await createApp(viewer);

    const res = await request(app)
      .post("/graphql")
      .send({
        query: `
          query TeamStaffBlock($id: ID!) {
            teamById(id: $id) {
              id
              ... on Team {
                staff {
                  buildsCount
                  owners {
                    email
                  }
                }
              }
            }
          }
        `,
        variables: { id: teamAccount.id },
      });

    // A member reaching a team they belong to gets the block nulled as a
    // whole — counts included. One guard covers every field under it.
    expectNoGraphQLError(res);
    expect(res.body.data.teamById.staff).toBeNull();
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
    // The record names who reached out, not just when.
    expect(marked.body.data.setTeamStaffContact.staff.contact.user.id).toBe(
      viewer.userAccount.id,
    );

    const cleared = await request(app)
      .post("/graphql")
      .send({
        query: SetContactMutation,
        variables: { teamAccountId: teamAccount.id, contacted: false },
      });

    expectNoGraphQLError(cleared);
    expect(cleared.body.data.setTeamStaffContact.staff.contact).toBeNull();
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

    // The unique constraint would otherwise blow up on the second click.
    const contacts = await StaffTeamContact.query().where(
      "teamId",
      teamAccount.teamId!,
    );
    expect(contacts).toHaveLength(1);
  });

  it("refuses to mark an account that is not a team", async () => {
    const viewer = await createViewer({ staff: true });
    const app = await createApp(viewer);

    const res = await request(app)
      .post("/graphql")
      .send({
        query: SetContactMutation,
        // The viewer's own personal account: the field is declared `Team!`, so
        // returning it would break the response against the schema.
        variables: { teamAccountId: viewer.userAccount.id, contacted: true },
      });

    expect(res.body.errors[0].extensions.code).toBe("BAD_USER_INPUT");
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
