import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { describe, expect, test } from "vitest";

import { TeamDomain, User, type Account } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const CompleteWelcomeMutation = `
  mutation CompleteWelcome($input: CompleteWelcomeInput!) {
    completeWelcome(input: $input) {
      id
    }
  }
`;

const EligibleDomainQuery = `
  query EligibleDomain {
    me {
      id
      eligibleAutoJoinDomain
    }
  }
`;

async function listDomains(teamId: string | null): Promise<string[]> {
  invariant(teamId, "not a team account");
  const teamDomains = await TeamDomain.query()
    .where({ teamId })
    .orderBy("domain", "asc");
  return teamDomains.map((teamDomain) => teamDomain.domain);
}

type Fixtures = {
  /** A signed-up user who has not been through the welcome page yet. */
  user: { account: Account; user: User; userId: string };
  /** A team the user owns, with no email domain configured. */
  teamAccount: Account;
  post: (body: object) => request.Test;
};

const welcomeTest = test.extend<Fixtures>({
  user: async ({}, use) => {
    await setupDatabase();
    const account = await factory.UserAccount.create();
    await account.$fetchGraph("user");
    invariant(account.user, "user not fetched");
    invariant(account.userId, "user account has no user");
    await use({ account, user: account.user, userId: account.userId });
  },
  teamAccount: async ({ user }, use) => {
    const teamAccount = await factory.TeamAccount.create();
    invariant(teamAccount.teamId, "team account has no team");
    await factory.TeamUser.create({
      teamId: teamAccount.teamId,
      userId: user.userId,
      userLevel: "owner",
    });
    await use(teamAccount);
  },
  post: async ({ user }, use) => {
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: user.user, account: user.account },
    );
    await use((body: object) => request(app).post("/graphql").send(body));
  },
});

describe("completeWelcome", () => {
  welcomeTest("records the source", async ({ user, post }) => {
    const res = await post({
      query: CompleteWelcomeMutation,
      variables: { input: { source: "search_engine" } },
    });

    expectNoGraphQLError(res);
    const updated = await User.query().findById(user.userId).throwIfNotFound();
    expect(updated.signupSource).toBe("search_engine");
    expect(updated.signupSourceDetail).toBeNull();
    expect(updated.signupSourceAskedAt).not.toBeNull();
  });

  welcomeTest(
    "keeps the free-text answer for `other`",
    async ({ user, post }) => {
      const res = await post({
        query: CompleteWelcomeMutation,
        variables: {
          input: { source: "other", sourceDetail: "  A talk at dotJS  " },
        },
      });

      expectNoGraphQLError(res);
      const updated = await User.query()
        .findById(user.userId)
        .throwIfNotFound();
      expect(updated.signupSource).toBe("other");
      expect(updated.signupSourceDetail).toBe("A talk at dotJS");
    },
  );

  welcomeTest(
    "drops a free-text answer sent with a predefined source",
    async ({ user, post }) => {
      const res = await post({
        query: CompleteWelcomeMutation,
        variables: {
          input: { source: "github", sourceDetail: "should be ignored" },
        },
      });

      expectNoGraphQLError(res);
      const updated = await User.query()
        .findById(user.userId)
        .throwIfNotFound();
      expect(updated.signupSourceDetail).toBeNull();
    },
  );

  welcomeTest(
    "records a skip, so the question is not asked again",
    async ({ user, post }) => {
      const res = await post({
        query: CompleteWelcomeMutation,
        variables: { input: {} },
      });

      expectNoGraphQLError(res);
      const updated = await User.query()
        .findById(user.userId)
        .throwIfNotFound();
      expect(updated.signupSource).toBeNull();
      expect(updated.signupSourceAskedAt).not.toBeNull();
    },
  );

  welcomeTest(
    "opens the team to the user's email domain",
    async ({ user, teamAccount, post }) => {
      await factory.UserEmail.create({
        userId: user.userId,
        email: "jane@acme.com",
        verified: true,
      });

      const res = await post({
        query: CompleteWelcomeMutation,
        variables: {
          input: {
            source: "word_of_mouth",
            autoJoinTeamSlug: teamAccount.slug,
          },
        },
      });

      expectNoGraphQLError(res);
      await expect(listDomains(teamAccount.teamId)).resolves.toEqual([
        "acme.com",
      ]);
    },
  );

  welcomeTest(
    "refuses to open a team when the user has no company domain",
    async ({ user, teamAccount, post }) => {
      await factory.UserEmail.create({
        userId: user.userId,
        email: "jane@gmail.com",
        verified: true,
      });

      const res = await post({
        query: CompleteWelcomeMutation,
        variables: {
          input: { source: "github", autoJoinTeamSlug: teamAccount.slug },
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toHaveLength(1);
      expect(res.body.errors[0].extensions).toMatchObject({
        code: "BAD_USER_INPUT",
      });
      await expect(listDomains(teamAccount.teamId)).resolves.toEqual([]);
      // The answers are not stored either, so the page can ask again.
      const updated = await User.query()
        .findById(user.userId)
        .throwIfNotFound();
      expect(updated.signupSourceAskedAt).toBeNull();
    },
  );

  welcomeTest(
    "refuses to open a team the user does not administer",
    async ({ user, post }) => {
      await factory.UserEmail.create({
        userId: user.userId,
        email: "jane@acme.com",
        verified: true,
      });
      const otherTeamAccount = await factory.TeamAccount.create();
      invariant(otherTeamAccount.teamId, "team account has no team");

      const res = await post({
        query: CompleteWelcomeMutation,
        variables: {
          input: { autoJoinTeamSlug: otherTeamAccount.slug },
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toHaveLength(1);
      await expect(listDomains(otherTeamAccount.teamId)).resolves.toEqual([]);
    },
  );

  welcomeTest(
    "refuses a free-text answer longer than the column",
    async ({ user, post }) => {
      const res = await post({
        query: CompleteWelcomeMutation,
        variables: {
          input: { source: "other", sourceDetail: "x".repeat(300) },
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toHaveLength(1);
      expect(res.body.errors[0].extensions).toMatchObject({
        code: "BAD_USER_INPUT",
        field: "sourceDetail",
      });
      // Rejected before anything was written, so the page can ask again.
      const updated = await User.query()
        .findById(user.userId)
        .throwIfNotFound();
      expect(updated.signupSourceAskedAt).toBeNull();
    },
  );

  welcomeTest("refuses an unknown team slug", async ({ user, post }) => {
    const res = await post({
      query: CompleteWelcomeMutation,
      variables: { input: { autoJoinTeamSlug: "no-such-team" } },
    });

    expect(res.status).toBe(200);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].extensions).toMatchObject({
      code: "BAD_USER_INPUT",
    });
    const updated = await User.query().findById(user.userId).throwIfNotFound();
    expect(updated.signupSourceAskedAt).toBeNull();
  });
});

describe("User.eligibleAutoJoinDomain", () => {
  welcomeTest("exposes a company domain", async ({ user, post }) => {
    await factory.UserEmail.create({
      userId: user.userId,
      email: "jane@acme.com",
      verified: true,
    });

    const res = await post({ query: EligibleDomainQuery });

    expectNoGraphQLError(res);
    expect(res.body.data.me.eligibleAutoJoinDomain).toBe("acme.com");
  });

  welcomeTest(
    "exposes nothing for a consumer provider",
    async ({ user, post }) => {
      await factory.UserEmail.create({
        userId: user.userId,
        email: "jane@gmail.com",
        verified: true,
      });

      const res = await post({ query: EligibleDomainQuery });

      expectNoGraphQLError(res);
      expect(res.body.data.me.eligibleAutoJoinDomain).toBeNull();
    },
  );

  welcomeTest(
    "refuses to read it off a teammate",
    async ({ teamAccount, post }) => {
      // A teammate is the one other `User` a viewer can legitimately reach, so
      // it is the path this field has to stay out of.
      const otherAccount = await factory.UserAccount.create();
      invariant(otherAccount.userId, "user account has no user");
      await factory.UserEmail.create({
        userId: otherAccount.userId,
        email: "john@acme.com",
        verified: true,
      });
      await factory.TeamUser.create({
        teamId: teamAccount.teamId,
        userId: otherAccount.userId,
        userLevel: "member",
      });

      const res = await post({
        query: `
          query TeammateEligibleDomain($teamAccountId: ID!) {
            teamById(id: $teamAccountId) {
              id
              ... on Team {
                members(first: 30, after: 0) {
                  edges {
                    id
                    user {
                      id
                      eligibleAutoJoinDomain
                    }
                  }
                }
              }
            }
          }
        `,
        variables: { teamAccountId: teamAccount.id },
      });

      expect(res.status).toBe(200);
      expect(res.body.errors).toHaveLength(1);
      expect(res.body.errors[0].extensions).toMatchObject({
        code: "FORBIDDEN",
      });
    },
  );
});
