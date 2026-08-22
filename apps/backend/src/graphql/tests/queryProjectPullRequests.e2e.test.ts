import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import type { Account, Project } from "@/database/models";
import { OriginPullRequest, OriginRepository } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

describe("GraphQL queryProjectPullRequests", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  let userAccount: Account;
  let teamAccount: Account;
  let project: Project;

  beforeEach(async () => {
    userAccount = await factory.UserAccount.create();
    await userAccount.$fetchGraph("user");
    teamAccount = await factory.TeamAccount.create();
    await teamAccount.$fetchGraph("team");
    project = await factory.Project.create({
      accountId: teamAccount.id,
    });
    await factory.TeamUser.create({
      teamId: teamAccount.teamId!,
      userId: userAccount.userId!,
      userLevel: "owner",
    });
  });

  async function queryPullRequests(input: {
    account: Account;
    variables?: { first?: number; after?: number };
  }) {
    await input.account.$fetchGraph("user");
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: input.account.user!,
        account: input.account,
      },
    );
    const res = await request(app)
      .post("/graphql")
      .send({
        query: `{
          project(
            accountSlug: "${teamAccount.slug}",
            projectName: "${project.name}",
          ) {
            pullRequests(
              first: ${input.variables?.first ?? 30},
              after: ${input.variables?.after ?? 0},
            ) {
              pageInfo {
                totalCount
                hasNextPage
                isEmpty
              }
              edges {
                id
                pullRequest {
                  __typename
                  id
                  number
                  title
                }
                builds {
                  id
                  number
                }
                medias {
                  id
                  name
                }
              }
            }
          }
        }`,
      });
    expectNoGraphQLError(res);
    expect(res.status).toBe(200);
    return res.body.data.project.pullRequests;
  }

  it("lists pull requests with activity in the project, newest first", async () => {
    const [olderPullRequest, newerPullRequest, foreignPullRequest] =
      await factory.PullRequest.createMany(3, [
        { number: 1, title: "Older", createdAt: "2024-01-01T00:00:00.000Z" },
        { number: 2, title: "Newer", createdAt: "2024-01-03T00:00:00.000Z" },
        { number: 3, title: "Foreign", createdAt: "2024-01-04T00:00:00.000Z" },
      ]);
    const mediaPullRequest = await factory.PullRequest.create({
      number: 4,
      title: "Media only",
      createdAt: "2024-01-02T00:00:00.000Z",
    });

    const [olderBuild, newerBuild1, newerBuild2] =
      await factory.Build.createMany(3, [
        {
          projectId: project.id,
          githubPullRequestId: olderPullRequest!.id,
          createdAt: "2024-01-01T01:00:00.000Z",
        },
        {
          projectId: project.id,
          githubPullRequestId: newerPullRequest!.id,
          createdAt: "2024-01-03T01:00:00.000Z",
        },
        {
          projectId: project.id,
          githubPullRequestId: newerPullRequest!.id,
          createdAt: "2024-01-03T02:00:00.000Z",
        },
      ]);

    // A pull request whose only activity is in another project stays out of
    // this project's list.
    const otherProject = await factory.Project.create({
      accountId: teamAccount.id,
    });
    await factory.Build.create({
      projectId: otherProject.id,
      githubPullRequestId: foreignPullRequest!.id,
    });
    // The same pull request referenced by another project's build: the row
    // shows, its builds stay scoped to this project.
    await factory.Build.create({
      projectId: otherProject.id,
      githubPullRequestId: newerPullRequest!.id,
    });

    const { media } = await factory.createMediaWithVersion({
      media: {
        projectId: project.id,
        githubPullRequestId: mediaPullRequest.id,
        visibility: "public",
      },
    });

    const pullRequests = await queryPullRequests({ account: userAccount });
    expect(pullRequests.pageInfo).toEqual({
      totalCount: 3,
      hasNextPage: false,
      isEmpty: false,
    });
    expect(pullRequests.edges).toEqual([
      {
        id: `github:${project.id}:${newerPullRequest!.id}`,
        pullRequest: {
          __typename: "GithubPullRequest",
          id: newerPullRequest!.id,
          number: 2,
          title: "Newer",
        },
        builds: [
          { id: newerBuild2!.id, number: 3 },
          { id: newerBuild1!.id, number: 2 },
        ],
        medias: [],
      },
      {
        id: `github:${project.id}:${mediaPullRequest.id}`,
        pullRequest: {
          __typename: "GithubPullRequest",
          id: mediaPullRequest.id,
          number: 4,
          title: "Media only",
        },
        builds: [],
        medias: [{ id: media.id, name: media.name }],
      },
      {
        id: `github:${project.id}:${olderPullRequest!.id}`,
        pullRequest: {
          __typename: "GithubPullRequest",
          id: olderPullRequest!.id,
          number: 1,
          title: "Older",
        },
        builds: [{ id: olderBuild!.id, number: 1 }],
        medias: [],
      },
    ]);
  });

  it("paginates across providers", async () => {
    const githubPullRequest = await factory.PullRequest.create({
      number: 10,
      createdAt: "2024-02-01T00:00:00.000Z",
    });
    await factory.Build.create({
      projectId: project.id,
      githubPullRequestId: githubPullRequest.id,
    });

    const originRepository = await OriginRepository.query().insertAndFetch({
      originId: "origin-repo-1",
      name: "sparkle",
      ownerSlug: "acme",
      ownerId: "origin-owner-1",
      defaultBranch: "main",
    });
    const originPullRequest = await OriginPullRequest.query().insertAndFetch({
      originRepositoryId: originRepository.id,
      number: 20,
      title: "Origin PR",
      jobStatus: "complete",
      createdAt: "2024-02-02T00:00:00.000Z",
    });
    await factory.Build.create({
      projectId: project.id,
      originPullRequestId: originPullRequest.id,
    });

    const firstPage = await queryPullRequests({
      account: userAccount,
      variables: { first: 1, after: 0 },
    });
    expect(firstPage.pageInfo).toEqual({
      totalCount: 2,
      hasNextPage: true,
      isEmpty: false,
    });
    expect(firstPage.edges).toHaveLength(1);
    expect(firstPage.edges[0].pullRequest).toEqual({
      __typename: "OriginPullRequest",
      id: originPullRequest.id,
      number: 20,
      title: "Origin PR",
    });

    const secondPage = await queryPullRequests({
      account: userAccount,
      variables: { first: 1, after: 1 },
    });
    expect(secondPage.pageInfo).toEqual({
      totalCount: 2,
      hasNextPage: false,
      isEmpty: false,
    });
    expect(secondPage.edges[0].pullRequest.__typename).toBe(
      "GithubPullRequest",
    );
    expect(secondPage.edges[0].pullRequest.number).toBe(10);
  });

  it("hides team-only media from viewers without membership", async () => {
    // Public, so a user outside the team can query the project at all.
    await project.$query().patch({ private: false });

    const pullRequest = await factory.PullRequest.create({ number: 30 });
    const { media: publicMedia } = await factory.createMediaWithVersion({
      media: {
        projectId: project.id,
        githubPullRequestId: pullRequest.id,
        visibility: "public",
      },
    });
    await factory.createMediaWithVersion({
      media: {
        projectId: project.id,
        githubPullRequestId: pullRequest.id,
        visibility: "team",
      },
    });

    const outsiderAccount = await factory.UserAccount.create();
    const outsiderView = await queryPullRequests({ account: outsiderAccount });
    expect(outsiderView.edges).toHaveLength(1);
    expect(outsiderView.edges[0].medias).toEqual([
      { id: publicMedia.id, name: publicMedia.name },
    ]);

    const memberView = await queryPullRequests({ account: userAccount });
    expect(memberView.edges[0].medias).toHaveLength(2);
  });

  it("returns an empty connection when the project has no pull requests", async () => {
    // A build with no pull request must not surface anything.
    await factory.Build.create({ projectId: project.id });

    const pullRequests = await queryPullRequests({ account: userAccount });
    expect(pullRequests.pageInfo).toEqual({
      totalCount: 0,
      hasNextPage: false,
      isEmpty: true,
    });
    expect(pullRequests.edges).toEqual([]);
  });
});
