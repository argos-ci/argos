import request from "supertest";

import type {
  Account,
  Build,
  Project,
  Screenshot,
  ScreenshotDiff,
  TeamUser,
} from "@argos-ci/database/models";
import { factory, useDatabase } from "@argos-ci/database/testing";

import { apolloServer } from "../apollo.js";
import { expectNoGraphQLError } from "../testing.js";
import { createApolloServerApp } from "./util.js";

describe("GraphQL", () => {
  useDatabase();

  describe("resolveBuild", () => {
    let userAccount: Account;
    let teamAccount: Account;
    let project: Project;
    let build: Build;
    let screenshot2: Screenshot;

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
      build = await factory.create<Build>("Build", {
        projectId: project.id,
      });
      const screenshot1 = await factory.create<Screenshot>("Screenshot", {
        name: "email_deleted",
      });
      screenshot2 = await factory.create<Screenshot>("Screenshot", {
        name: "email_deleted",
      });
      const screenshot3 = await factory.create<Screenshot>("Screenshot", {
        name: "email_added",
      });
      await factory.createMany<ScreenshotDiff>("ScreenshotDiff", [
        {
          buildId: build.id,
          baseScreenshotId: screenshot1.id,
          compareScreenshotId: screenshot2.id,
          score: 0,
        },
        {
          buildId: build.id,
          baseScreenshotId: screenshot1.id,
          compareScreenshotId: screenshot2.id,
          score: 0.3,
        },
        {
          buildId: build.id,
          baseScreenshotId: screenshot3.id,
          compareScreenshotId: screenshot3.id,
          score: 0,
        },
      ]);
    });

    it("should sort the diffs by score", async () => {
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
              build(number: 1) {
                screenshotDiffs(after: 0, first: 10) {
                  edges {
                    name
                    status
                  }
                }
              }
            }
          }`,
        });
      expectNoGraphQLError(res);
      expect(res.status).toBe(200);

      const { edges: screenshotDiffs } =
        res.body.data.project.build.screenshotDiffs;
      expect(screenshotDiffs).toEqual([
        {
          name: "email_deleted",
          status: "changed",
        },
        {
          name: "email_added",
          status: "unchanged",
        },
        {
          name: "email_deleted",
          status: "unchanged",
        },
      ]);
    });
  });
});
