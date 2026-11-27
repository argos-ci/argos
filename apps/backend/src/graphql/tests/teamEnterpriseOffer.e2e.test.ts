import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { describe, expect, test } from "vitest";

import type { Account } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const EnterpriseOfferQuery = `
  query EnterpriseOffer($slug: String!) {
    account(slug: $slug) {
      ... on Team {
        showEnterpriseOffer
      }
    }
  }
`;

async function createUser() {
  const account = await factory.UserAccount.create();
  await account.$fetchGraph("user");
  invariant(account.user, "user not fetched");
  return { account, user: account.user };
}

type Viewer = Awaited<ReturnType<typeof createUser>>;

const withOfferedTeam = test.extend<{
  /** A team on Pro whose running period came to $1,500. */
  team: Account;
  owner: Viewer;
  member: Viewer;
}>({
  team: async ({}, use) => {
    await setupDatabase();
    const team = await factory.TeamAccount.create();
    const plan = await factory.Plan.create({
      name: "pro",
      usageBased: true,
      interval: "month",
      includedScreenshots: 1000,
    });
    await factory.Subscription.create({
      accountId: team.id,
      planId: plan.id,
      includedScreenshots: 1000,
      currency: "usd",
      flatPrice: 100,
      additionalScreenshotPrice: 0.5,
      createdAt: new Date("2021-01-01").toISOString(),
      startDate: new Date("2021-01-01").toISOString(),
    });
    const project = await factory.Project.create({ accountId: team.id });
    // 2,800 screenshots past the quota at $0.50, plus the $100 plan.
    await factory.ScreenshotBucket.create({
      projectId: project.id,
      screenshotCount: 3800,
    });
    await use(team);
  },
  owner: async ({ team }, use) => {
    invariant(team.teamId, "team account has no team");
    const owner = await createUser();
    await factory.TeamUser.create({
      teamId: team.teamId,
      userId: owner.user.id,
      userLevel: "owner",
    });
    await use(owner);
  },
  member: async ({ team }, use) => {
    invariant(team.teamId, "team account has no team");
    const member = await createUser();
    await factory.TeamUser.create({
      teamId: team.teamId,
      userId: member.user.id,
      userLevel: "member",
    });
    await use(member);
  },
});

async function queryOffer(viewer: Viewer, team: Account) {
  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    viewer,
  );
  const res = await request(app)
    .post("/graphql")
    .send({ query: EnterpriseOfferQuery, variables: { slug: team.slug } });
  expectNoGraphQLError(res);
  return res.body.data.account.showEnterpriseOffer;
}

describe("GraphQL Team.showEnterpriseOffer", () => {
  withOfferedTeam(
    "offers Enterprise to who manages billing, and to nobody else",
    async ({ team, owner, member }) => {
      await expect(queryOffer(owner, team)).resolves.toBe(true);
      await expect(queryOffer(member, team)).resolves.toBe(false);
    },
  );
});
