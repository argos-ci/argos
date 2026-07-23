import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const MeStaffQuery = `
  query MeStaff {
    me {
      id
      staff
    }
  }
`;

/**
 * Team members are the realistic way to reach another user's node: `account`
 * already returns null for someone else's account, so it never reaches the
 * resolver at all.
 */
const TeamMembersStaffQuery = `
  query TeamMembersStaff($teamAccountId: ID!) {
    teamById(id: $teamAccountId) {
      id
      ... on Team {
        members(first: 10, after: 0) {
          edges {
            id
            user {
              id
              staff
            }
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

async function createApp(auth: Awaited<ReturnType<typeof createViewer>>) {
  return createApolloServerApp(apolloServer, createApolloMiddleware, {
    user: auth.user,
    account: auth.userAccount,
  });
}

describe("GraphQL User.staff", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("tells the viewer they are staff", async () => {
    const viewer = await createViewer({ staff: true });
    const app = await createApp(viewer);

    const res = await request(app).post("/graphql").send({
      query: MeStaffQuery,
    });

    expectNoGraphQLError(res);
    expect(res.body.data.me.staff).toBe(true);
  });

  it("tells the viewer they are not staff", async () => {
    const viewer = await createViewer({ staff: false });
    const app = await createApp(viewer);

    const res = await request(app).post("/graphql").send({
      query: MeStaffQuery,
    });

    expectNoGraphQLError(res);
    expect(res.body.data.me.staff).toBe(false);
  });

  it("refuses to reveal whether a teammate is staff", async () => {
    const viewer = await createViewer({ staff: false });
    const other = await createViewer({ staff: true });

    const teamAccount = await factory.TeamAccount.create();
    invariant(teamAccount.teamId, "team account has no team");
    for (const member of [viewer, other]) {
      invariant(member.userAccount.userId, "account has no user");
      await factory.TeamUser.create({
        teamId: teamAccount.teamId,
        userId: member.userAccount.userId,
        userLevel: "owner",
      });
    }

    const app = await createApp(viewer);

    const res = await request(app)
      .post("/graphql")
      .send({
        query: TeamMembersStaffQuery,
        variables: { teamAccountId: teamAccount.id },
      });

    // Who holds elevated permissions must not leak, even to teammates. The
    // field returns null rather than erroring: it is selected in the auth
    // bootstrap query, where an error would nullify `me` and log the user out.
    // Erroring rather than returning null keeps "withheld" distinct from a
    // genuine `false`.
    expect(res.body.errors[0].extensions.code).toBe("FORBIDDEN");
    // The field is nullable, so the error stays on it: the surrounding data
    // survives instead of being nullified up to the root.
    expect(res.body.data.teamById).not.toBeNull();
  });
});
