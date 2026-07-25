import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import type { Account, Build, Project, Screenshot } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

describe("GraphQL", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  describe("fallbackBaselineName", () => {
    let userAccount: Account;
    let teamAccount: Account;
    let project: Project;
    let build: Build;

    beforeEach(async () => {
      userAccount = await factory.UserAccount.create();
      await userAccount.$fetchGraph("user");
      teamAccount = await factory.TeamAccount.create();
      await teamAccount.$fetchGraph("team");
      project = await factory.Project.create({ accountId: teamAccount.id });
      await factory.TeamUser.create({
        teamId: teamAccount.teamId!,
        userId: userAccount.userId!,
        userLevel: "owner",
      });
      build = await factory.Build.create({ projectId: project.id });
    });

    const queryDiffs = async () => {
      const app = await createApolloServerApp(
        apolloServer,
        createApolloMiddleware,
        { user: userAccount.user!, account: userAccount },
      );
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
                  edges { name fallbackBaselineName }
                }
              }
            }
          }`,
        });
      expectNoGraphQLError(res);
      expect(res.status).toBe(200);
      return res.body.data.project.build.screenshotDiffs.edges;
    };

    it("reports the baseline when it is a fallback", async () => {
      const base = await factory.Screenshot.create({ name: "home.png" });
      const compare = await factory.Screenshot.create({
        name: "home-variant-b.png",
        baseNames: ["home-variant-b.png", "home.png"],
      });
      await factory.ScreenshotDiff.create({
        buildId: build.id,
        baseScreenshotId: base.id,
        compareScreenshotId: compare.id,
        score: 0.3,
      });

      expect(await queryDiffs()).toEqual([
        { name: "home-variant-b.png", fallbackBaselineName: "home.png" },
      ]);
    });

    it("is null when the baseline shares the snapshot name", async () => {
      const base = await factory.Screenshot.create({ name: "home.png" });
      const compare = await factory.Screenshot.create({ name: "home.png" });
      await factory.ScreenshotDiff.create({
        buildId: build.id,
        baseScreenshotId: base.id,
        compareScreenshotId: compare.id,
        score: 0.3,
      });

      expect(await queryDiffs()).toEqual([
        { name: "home.png", fallbackBaselineName: null },
      ]);
    });

    it("is null for a repeated snapshot compared to its sibling", async () => {
      // `repeatEach` points the repeat at the non-repeated snapshot. That is the
      // normal flow, not a fallback the user asked for.
      const base = await factory.Screenshot.create({
        name: "chromium/home.png",
      });
      const compare = await factory.Screenshot.create({
        name: "chromium/home repeat-2.png",
        baseNames: ["chromium/home.png"],
      });
      await factory.ScreenshotDiff.create({
        buildId: build.id,
        baseScreenshotId: base.id,
        compareScreenshotId: compare.id,
        score: 0.3,
      });

      expect(await queryDiffs()).toEqual([
        {
          name: "chromium/home repeat-2.png",
          fallbackBaselineName: null,
        },
      ]);
    });
  });

  describe("resolveBuild", () => {
    let userAccount: Account;
    let teamAccount: Account;
    let project: Project;
    let build: Build;
    let screenshot2: Screenshot;

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
      build = await factory.Build.create({
        projectId: project.id,
      });
      const screenshot1 = await factory.Screenshot.create({
        name: "email_deleted",
      });
      screenshot2 = await factory.Screenshot.create({
        name: "email_deleted",
      });
      const screenshot3 = await factory.Screenshot.create({
        name: "email_added",
      });
      await factory.ScreenshotDiff.createMany(3, [
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
          baseScreenshotId: screenshot1.id,
          compareScreenshotId: screenshot3.id,
          score: 0,
        },
      ]);
    });

    it("should sort the diffs by score", async () => {
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
      // A diff is named after its compare screenshot, which is also what the
      // diffs are sorted by, hence `email_added` before `email_deleted` among
      // the two unchanged ones.
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
