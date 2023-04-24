import request from "supertest";

import type {
  Account,
  Build,
  Project,
  ScreenshotDiff,
  TeamUser,
} from "@argos-ci/database/models";
import { factory, useDatabase } from "@argos-ci/database/testing";

import { apolloServer } from "../apollo.js";
import { expectNoGraphQLError } from "../testing.js";
import { createApolloServerApp } from "./util.js";

describe("GraphQL", () => {
  useDatabase();

  describe("queryRepository", () => {
    let userAccount: Account;
    let teamAccount: Account;
    let project: Project;

    beforeEach(async () => {
      userAccount = await factory.create<Account>("UserAccount");
      await userAccount.$fetchGraph("user");
      teamAccount = await factory.create<Account>("TeamAccount");
      await teamAccount.$fetchGraph("team");
      project = await factory.create<Project>("Project", {
        accountId: teamAccount.id,
      });
      await factory.create<TeamUser>("TeamUser", {
        teamId: teamAccount.teamId!,
        userId: userAccount.userId!,
        userLevel: "owner",
      });
    });

    it("should list builds sorted by number", async () => {
      await factory.create<Build>("Build", {
        projectId: project.id,
        createdAt: "2017-02-04T17:14:28.167Z",
      });
      const build = await factory.create<Build>("Build", {
        projectId: project.id,
        createdAt: "2017-02-05T17:14:28.167Z",
      });
      await factory.create<ScreenshotDiff>("ScreenshotDiff", {
        buildId: build.id,
      });
      const app = await createApolloServerApp(apolloServer, {
        user: userAccount.user!,
        account: userAccount,
      });
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
            status: "stable",
            createdAt: "2017-02-05T17:14:28.167Z",
          },
          {
            number: 1,
            status: "stable",
            createdAt: "2017-02-04T17:14:28.167Z",
          },
        ],
      });
    });
  });
});
