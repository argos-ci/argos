import { addDays } from "@argos/util/date";
import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { createApolloServerApp } from "./util";

const StaffTeamsQuery = `
  query StaffTeams(
    $after: Int!
    $first: Int!
    $search: String
    $interval: PlanInterval
    $orderBy: StaffTeamOrderBy!
  ) {
    staffTeams(
      after: $after
      first: $first
      search: $search
      interval: $interval
      orderBy: $orderBy
    ) {
      pageInfo {
        totalCount
        hasNextPage
      }
      edges {
        id
        slug
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

type Viewer = Awaited<ReturnType<typeof createViewer>>;

async function queryTeams(
  auth: Viewer,
  variables: {
    after?: number;
    first?: number;
    search?: string | null;
    interval?: "month" | "year" | null;
    orderBy?: string;
  },
) {
  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    {
      user: auth.user,
      account: auth.userAccount,
    },
  );

  return request(app)
    .post("/graphql")
    .send({
      query: StaffTeamsQuery,
      variables: {
        after: 0,
        first: 100,
        search: null,
        interval: null,
        orderBy: "NAME_ASC",
        ...variables,
      },
    });
}

/**
 * The slugs the directory returned, in order. The factories pull whole chains
 * behind them, so tests search on their own prefix rather than trusting that
 * the directory holds only what they created.
 */
function getSlugs(res: request.Response): string[] {
  invariant(!res.body.errors, JSON.stringify(res.body.errors));
  return res.body.data.staffTeams.edges.map(
    (team: { slug: string }) => team.slug,
  );
}

describe("GraphQL staffTeams", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("is forbidden to non-staff users", async () => {
    const viewer = await createViewer({ staff: false });
    await factory.TeamAccount.create();

    const res = await queryTeams(viewer, {});

    expect(res.body.errors[0].extensions.code).toBe("FORBIDDEN");
  });

  it("paginates and reports the total beyond the page", async () => {
    const viewer = await createViewer({ staff: true });
    // Named explicitly: the directory orders on the name it displays, and the
    // factory would otherwise generate three unrelated ones.
    for (const index of [1, 2, 3]) {
      await factory.TeamAccount.create({
        slug: `page-team-${index}`,
        name: `Page Team ${index}`,
      });
    }

    const first = await queryTeams(viewer, {
      search: "page-team",
      first: 2,
    });

    expect(getSlugs(first)).toEqual(["page-team-1", "page-team-2"]);
    expect(first.body.data.staffTeams.pageInfo).toMatchObject({
      totalCount: 3,
      hasNextPage: true,
    });

    const second = await queryTeams(viewer, {
      search: "page-team",
      first: 2,
      after: 2,
    });

    expect(getSlugs(second)).toEqual(["page-team-3"]);
    expect(second.body.data.staffTeams.pageInfo.hasNextPage).toBe(false);
  });

  it("matches a search on the name as well as the slug", async () => {
    const viewer = await createViewer({ staff: true });
    await factory.TeamAccount.create({
      slug: "search-by-slug",
      name: "Nothing alike",
    });
    await factory.TeamAccount.create({
      slug: "unrelated-slug",
      name: "Search By Name",
    });

    const bySlug = await queryTeams(viewer, { search: "search-by-slug" });
    expect(getSlugs(bySlug)).toEqual(["search-by-slug"]);

    // Case-insensitive, and reaching the name means a team can be found by what
    // the directory displays rather than by what its URL happens to be.
    const byName = await queryTeams(viewer, { search: "search by name" });
    expect(getSlugs(byName)).toEqual(["unrelated-slug"]);
  });

  it("treats wildcards in a search as the characters they are", async () => {
    const viewer = await createViewer({ staff: true });
    await factory.TeamAccount.create({ slug: "wild-100-percent" });
    await factory.TeamAccount.create({ slug: "wild-fifty" });

    // Unescaped, `%` would match both — and every other team besides.
    const res = await queryTeams(viewer, { search: "wild-100%" });

    expect(getSlugs(res)).toEqual([]);
  });

  it("orders by creation date", async () => {
    const viewer = await createViewer({ staff: true });
    await factory.TeamAccount.create({
      slug: "order-old",
      createdAt: addDays(new Date(), -30).toISOString(),
    });
    await factory.TeamAccount.create({
      slug: "order-new",
      createdAt: addDays(new Date(), -1).toISOString(),
    });

    const res = await queryTeams(viewer, {
      search: "order-",
      orderBy: "CREATED_DESC",
    });

    expect(getSlugs(res)).toEqual(["order-new", "order-old"]);
  });

  describe("with plans of both intervals", () => {
    let viewer: Viewer;

    beforeEach(async () => {
      viewer = await createViewer({ staff: true });

      const [monthlyPlan, yearlyPlan] = await Promise.all([
        factory.Plan.create({ usageBased: true, interval: "month" }),
        factory.Plan.create({ usageBased: true, interval: "year" }),
      ]);

      // Created oldest first, so a creation ordering and a name ordering
      // disagree — which is what makes the ordering assertions meaningful.
      const teams = [
        { slug: "interval-zulu", plan: monthlyPlan, days: -30 },
        { slug: "interval-alpha", plan: yearlyPlan, days: -20 },
        { slug: "interval-mike", plan: monthlyPlan, days: -10 },
      ];

      for (const team of teams) {
        const account = await factory.TeamAccount.create({
          slug: team.slug,
          createdAt: addDays(new Date(), team.days).toISOString(),
        });
        const subscriber = await factory.User.create();
        await factory.Subscription.create({
          accountId: account.id,
          planId: team.plan.id,
          subscriberId: subscriber.id,
          status: "active",
          startDate: addDays(new Date(), team.days).toISOString(),
        });
      }
    });

    it("keeps only the teams billed on the requested interval", async () => {
      const res = await queryTeams(viewer, {
        search: "interval-",
        interval: "year",
      });

      expect(getSlugs(res)).toEqual(["interval-alpha"]);
      expect(res.body.data.staffTeams.pageInfo.totalCount).toBe(1);
    });

    it("keeps the requested ordering under an interval filter", async () => {
      // The filter and the column orderings are applied on two different code
      // paths. Filtering used to fall back to a name ordering, which silently
      // returned the right teams in the wrong order.
      const res = await queryTeams(viewer, {
        search: "interval-",
        interval: "month",
        orderBy: "CREATED_DESC",
      });

      expect(getSlugs(res)).toEqual(["interval-mike", "interval-zulu"]);
    });

    it("drops teams with no plan when an interval is requested", async () => {
      await factory.TeamAccount.create({ slug: "interval-unsubscribed" });

      const res = await queryTeams(viewer, {
        search: "interval-",
        interval: "month",
      });

      expect(getSlugs(res)).not.toContain("interval-unsubscribed");
    });
  });
});
