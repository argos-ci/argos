import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { test as base, beforeEach, describe, expect, vi } from "vitest";

import {
  Account,
  Build,
  BuildRequestedReviewer,
  Project,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { sendNotification } from "@/notification";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

vi.mock("@/notification", () => ({
  sendNotification: vi.fn(),
}));

const mockSendNotification = vi.mocked(sendNotification);

const ADD_MUTATION = `
  mutation AddBuildReviewers($input: AddBuildReviewersInput!) {
    addBuildReviewers(input: $input) {
      id
      reviewers {
        id
      }
    }
  }
`;

const REMOVE_MUTATION = `
  mutation RemoveBuildReviewers($input: RemoveBuildReviewersInput!) {
    removeBuildReviewers(input: $input) {
      id
      reviewers {
        id
      }
    }
  }
`;

function getAccountUser(account: Account) {
  invariant(account.user);
  return account.user;
}

function getAccountUserId(account: Account) {
  invariant(account.userId);
  return account.userId;
}

type Fixtures = {
  fixture: {
    ownerAccount: Account;
    member1: Account;
    member2: Account;
    outsiderAccount: Account;
    project: Project;
    build: Build;
  };
};

const test = base.extend<Fixtures>({
  fixture: async ({}, use) => {
    await setupDatabase();
    const [ownerAccount, member1, member2, outsiderAccount, teamAccount] =
      await Promise.all([
        factory.UserAccount.create(),
        factory.UserAccount.create(),
        factory.UserAccount.create(),
        factory.UserAccount.create(),
        factory.TeamAccount.create(),
      ]);
    invariant(teamAccount.teamId);
    const project = await factory.Project.create({ accountId: teamAccount.id });
    await Promise.all([
      factory.TeamUser.create({
        teamId: teamAccount.teamId,
        userId: getAccountUserId(ownerAccount),
        userLevel: "owner",
      }),
      factory.TeamUser.create({
        teamId: teamAccount.teamId,
        userId: getAccountUserId(member1),
        userLevel: "member",
      }),
      factory.TeamUser.create({
        teamId: teamAccount.teamId,
        userId: getAccountUserId(member2),
        userLevel: "member",
      }),
      ownerAccount.$fetchGraph("user"),
      outsiderAccount.$fetchGraph("user"),
    ]);
    const build = await factory.Build.create({ projectId: project.id });
    await use({
      ownerAccount,
      member1,
      member2,
      outsiderAccount,
      project,
      build,
    });
  },
});

/** Build an authenticated GraphQL app acting as the given user account. */
function appAs(account: Account) {
  return createApolloServerApp(apolloServer, createApolloMiddleware, {
    user: getAccountUser(account),
    account,
  });
}

describe("GraphQL build reviewers mutations", () => {
  beforeEach(() => {
    mockSendNotification.mockReset();
  });

  test("requests reviewers, lists them and notifies them", async ({
    fixture,
  }) => {
    const app = await appAs(fixture.ownerAccount);
    const res = await request(app)
      .post("/graphql")
      .send({
        query: ADD_MUTATION,
        variables: {
          input: {
            buildId: fixture.build.id,
            userIds: [fixture.member1.id, fixture.member2.id],
          },
        },
      });

    expectNoGraphQLError(res);
    const reviewerIds = res.body.data.addBuildReviewers.reviewers
      .map((reviewer: { id: string }) => reviewer.id)
      .sort();
    expect(reviewerIds).toEqual(
      [fixture.member1.id, fixture.member2.id].sort(),
    );

    const rows = await BuildRequestedReviewer.query().where(
      "buildId",
      fixture.build.id,
    );
    expect(rows).toHaveLength(2);
    expect(
      rows.every((row) => row.requestedById === fixture.ownerAccount.userId),
    ).toBe(true);

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    const call = mockSendNotification.mock.calls[0]?.[0];
    invariant(call);
    expect(call.type).toBe("review_requested");
    expect([...call.recipients].sort()).toEqual(
      [
        getAccountUserId(fixture.member1),
        getAccountUserId(fixture.member2),
      ].sort(),
    );
  });

  test("ignores users that are not project members", async ({ fixture }) => {
    const app = await appAs(fixture.ownerAccount);
    const res = await request(app)
      .post("/graphql")
      .send({
        query: ADD_MUTATION,
        variables: {
          input: {
            buildId: fixture.build.id,
            userIds: [fixture.member1.id, fixture.outsiderAccount.id],
          },
        },
      });

    expectNoGraphQLError(res);
    const reviewerIds = res.body.data.addBuildReviewers.reviewers.map(
      (reviewer: { id: string }) => reviewer.id,
    );
    expect(reviewerIds).toEqual([fixture.member1.id]);

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    const call = mockSendNotification.mock.calls[0]?.[0];
    invariant(call);
    expect(call.recipients).toEqual([getAccountUserId(fixture.member1)]);
  });

  test("is idempotent and notifies only newly added reviewers", async ({
    fixture,
  }) => {
    const app = await appAs(fixture.ownerAccount);
    const firstRes = await request(app)
      .post("/graphql")
      .send({
        query: ADD_MUTATION,
        variables: {
          input: { buildId: fixture.build.id, userIds: [fixture.member1.id] },
        },
      });
    expectNoGraphQLError(firstRes);
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    mockSendNotification.mockReset();

    const secondRes = await request(app)
      .post("/graphql")
      .send({
        query: ADD_MUTATION,
        variables: {
          input: {
            buildId: fixture.build.id,
            userIds: [fixture.member1.id, fixture.member2.id],
          },
        },
      });
    expectNoGraphQLError(secondRes);

    // No duplicate row for member1.
    const rows = await BuildRequestedReviewer.query().where(
      "buildId",
      fixture.build.id,
    );
    expect(rows).toHaveLength(2);

    // Only member2 (the newly added one) is notified.
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    const call = mockSendNotification.mock.calls[0]?.[0];
    invariant(call);
    expect(call.recipients).toEqual([getAccountUserId(fixture.member2)]);
  });

  test("does not notify the requester when requesting themselves", async ({
    fixture,
  }) => {
    const app = await appAs(fixture.ownerAccount);
    const res = await request(app)
      .post("/graphql")
      .send({
        query: ADD_MUTATION,
        variables: {
          input: {
            buildId: fixture.build.id,
            userIds: [fixture.ownerAccount.id, fixture.member1.id],
          },
        },
      });

    expectNoGraphQLError(res);
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    const call = mockSendNotification.mock.calls[0]?.[0];
    invariant(call);
    expect(call.recipients).toEqual([getAccountUserId(fixture.member1)]);
  });

  test("removes a requested reviewer", async ({ fixture }) => {
    const app = await appAs(fixture.ownerAccount);
    await request(app)
      .post("/graphql")
      .send({
        query: ADD_MUTATION,
        variables: {
          input: {
            buildId: fixture.build.id,
            userIds: [fixture.member1.id, fixture.member2.id],
          },
        },
      });

    const res = await request(app)
      .post("/graphql")
      .send({
        query: REMOVE_MUTATION,
        variables: {
          input: { buildId: fixture.build.id, userIds: [fixture.member1.id] },
        },
      });

    expectNoGraphQLError(res);
    const reviewerIds = res.body.data.removeBuildReviewers.reviewers.map(
      (reviewer: { id: string }) => reviewer.id,
    );
    expect(reviewerIds).toEqual([fixture.member2.id]);

    const rows = await BuildRequestedReviewer.query().where(
      "buildId",
      fixture.build.id,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.userId).toBe(getAccountUserId(fixture.member2));
  });

  test("forbids users without the review permission", async ({ fixture }) => {
    const app = await appAs(fixture.outsiderAccount);
    const res = await request(app)
      .post("/graphql")
      .send({
        query: ADD_MUTATION,
        variables: {
          input: { buildId: fixture.build.id, userIds: [fixture.member1.id] },
        },
      });

    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].extensions.code).toBe("FORBIDDEN");
    const rows = await BuildRequestedReviewer.query().where(
      "buildId",
      fixture.build.id,
    );
    expect(rows).toHaveLength(0);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});
