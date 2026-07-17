import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import type { Account, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const MAIN_COMMIT = "a1b2c3d4e5f6a7b8c9d0a1b2c3d4e5f6a7b8c9d0";
const PR_HEAD_COMMIT = "0d9c8b7a6f5e4d3c2b1a0d9c8b7a6f5e4d3c2b1a";

describe("GraphQL", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  describe("Project.builds", () => {
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
      const [mainBucket, featureBucket, fixBucket] =
        await factory.ScreenshotBucket.createMany(3, [
          { projectId: project.id, branch: "main", commit: MAIN_COMMIT },
          { projectId: project.id, branch: "feat/search-box" },
          { projectId: project.id, branch: "fix/login" },
        ]);
      await factory.Build.createMany(3, [
        {
          projectId: project.id,
          name: "default",
          compareScreenshotBucketId: mainBucket!.id,
        },
        {
          projectId: project.id,
          name: "storybook",
          compareScreenshotBucketId: featureBucket!.id,
        },
        {
          projectId: project.id,
          name: "default",
          compareScreenshotBucketId: fixBucket!.id,
          prHeadCommit: PR_HEAD_COMMIT,
        },
      ]);
    });

    async function queryBuilds(args: {
      first?: number;
      after?: number;
      search?: string;
      withTotalCount?: boolean;
    }) {
      const app = await createApolloServerApp(
        apolloServer,
        createApolloMiddleware,
        {
          user: userAccount.user!,
          account: userAccount,
        },
      );
      const res = await request(app)
        .post("/graphql")
        .send({
          query: `
            query Builds($accountSlug: String!, $projectName: String!, $first: Int!, $after: Int!, $filters: BuildsFilterInput) {
              project(accountSlug: $accountSlug, projectName: $projectName) {
                builds(first: $first, after: $after, filters: $filters) {
                  pageInfo {
                    hasNextPage
                    isEmpty
                    ${args.withTotalCount ? "totalCount" : ""}
                  }
                  edges {
                    name
                    branch
                    commit
                  }
                }
              }
            }
          `,
          variables: {
            accountSlug: teamAccount.slug,
            projectName: project.name,
            first: args.first ?? 10,
            after: args.after ?? 0,
            filters: args.search != null ? { search: args.search } : null,
          },
        });
      expectNoGraphQLError(res);
      expect(res.status).toBe(200);
      return res.body.data.project.builds;
    }

    it("lists builds without search", async () => {
      const builds = await queryBuilds({});
      expect(builds.edges).toHaveLength(3);
      expect(builds.pageInfo).toEqual({ hasNextPage: false, isEmpty: false });
    });

    it("paginates without a count query", async () => {
      const builds = await queryBuilds({ first: 2 });
      expect(builds.edges).toHaveLength(2);
      expect(builds.pageInfo).toEqual({ hasNextPage: true, isEmpty: false });
      const lastPage = await queryBuilds({ first: 2, after: 2 });
      expect(lastPage.edges).toHaveLength(1);
      expect(lastPage.pageInfo).toEqual({
        hasNextPage: false,
        isEmpty: false,
      });
    });

    it("still resolves totalCount when requested", async () => {
      const builds = await queryBuilds({ withTotalCount: true });
      expect(builds.pageInfo.totalCount).toBe(3);
      const filtered = await queryBuilds({
        search: "search-box",
        withTotalCount: true,
      });
      expect(filtered.pageInfo.totalCount).toBe(1);
    });

    it("searches by branch substring", async () => {
      const builds = await queryBuilds({ search: "search" });
      expect(builds.edges).toEqual([
        {
          name: "storybook",
          branch: "feat/search-box",
          commit: expect.any(String),
        },
      ]);
    });

    it("searches by build name", async () => {
      const builds = await queryBuilds({ search: "storyb" });
      expect(builds.edges).toEqual([
        {
          name: "storybook",
          branch: "feat/search-box",
          commit: expect.any(String),
        },
      ]);
    });

    it("searches by commit prefix", async () => {
      const builds = await queryBuilds({ search: MAIN_COMMIT.slice(0, 8) });
      expect(builds.edges).toEqual([
        { name: "default", branch: "main", commit: MAIN_COMMIT },
      ]);
    });

    it("searches by pull request head commit prefix", async () => {
      const builds = await queryBuilds({
        search: PR_HEAD_COMMIT.slice(0, 12).toUpperCase(),
      });
      expect(builds.edges).toEqual([
        { name: "default", branch: "fix/login", commit: expect.any(String) },
      ]);
    });

    it("returns an empty connection when nothing matches", async () => {
      const builds = await queryBuilds({ search: "does-not-exist" });
      expect(builds.edges).toEqual([]);
      expect(builds.pageInfo).toEqual({ hasNextPage: false, isEmpty: true });
    });

    it("escapes LIKE wildcards in the search", async () => {
      const builds = await queryBuilds({ search: "%" });
      expect(builds.edges).toEqual([]);
      expect(builds.pageInfo.isEmpty).toBe(true);
    });
  });
});
