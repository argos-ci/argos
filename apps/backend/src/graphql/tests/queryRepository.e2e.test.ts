import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import type { Account, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

describe("GraphQL", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  describe("queryRepository", () => {
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

    it("should list builds sorted by number", async () => {
      await factory.Build.create({
        projectId: project.id,
        createdAt: "2017-02-04T17:14:28.167Z",
      });
      const build = await factory.Build.create({
        projectId: project.id,
        createdAt: "2017-02-05T17:14:28.167Z",
      });
      await factory.ScreenshotDiff.create({
        buildId: build.id,
      });
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
          query: `{
            project(
              accountSlug: "${teamAccount.slug}",
              projectName: "${project.name}",
            ) {
              builds(
                first: 2,
                after: 0,
              ) {
                pageInfo {
                  totalCount
                  hasNextPage
                }
                edges {
                  status
                  number
                  createdAt
                }
              }
            }
          }`,
        });

      expectNoGraphQLError(res);
      expect(res.status).toBe(200);
      const { builds } = res.body.data.project;
      expect(builds).toEqual({
        pageInfo: {
          hasNextPage: false,
          totalCount: 2,
        },
        edges: [
          {
            number: 2,
            status: "NO_CHANGES",
            createdAt: "2017-02-05T17:14:28.167Z",
          },
          {
            number: 1,
            status: "NO_CHANGES",
            createdAt: "2017-02-04T17:14:28.167Z",
          },
        ],
      });
    });
  });
});
