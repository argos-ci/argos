import { setTimeout as delay } from "node:timers/promises";
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
import { quitAmqp } from "@argos-ci/job-core";

import { apolloServer } from "../apollo.js";
import { expectNoGraphQLError } from "../testing.js";
import { createApolloServerApp } from "./util.js";

describe("GraphQL", () => {
  useDatabase();

  afterAll(async () => {
    await delay(500);
    await quitAmqp();
  });

  describe("validationStatus", () => {
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
      await factory.create<ScreenshotDiff>("ScreenshotDiff", {
        buildId: build.id,
        baseScreenshotId: screenshot1.id,
        compareScreenshotId: screenshot2.id,
        score: 0,
      });
      await factory.create<ScreenshotDiff>("ScreenshotDiff", {
        buildId: build.id,
        baseScreenshotId: screenshot1.id,
        compareScreenshotId: screenshot2.id,
        score: 0.3,
      });
      await factory.create<ScreenshotDiff>("ScreenshotDiff", {
        buildId: build.id,
        baseScreenshotId: screenshot3.id,
        compareScreenshotId: screenshot3.id,
        score: 0,
      });
    });

    it("should mutate all the validationStatus", async () => {
      const app = await createApolloServerApp(apolloServer, {
        user: userAccount.user!,
        account: userAccount,
      });
      let res = await request(app)
        .post("/graphql")
        .send({
          query: `
            mutation {
              setValidationStatus(
                buildId: "${build.id}",
                validationStatus: rejected
              ){
                screenshotDiffs(after: 0, first: 10) {
                  edges {
                    validationStatus
                  }
                }
              }
            }
          `,
        });
      expect(
        res.body.data.setValidationStatus.screenshotDiffs.edges
      ).toHaveLength(3);
      res.body.data.setValidationStatus.screenshotDiffs.edges.forEach(
        (screenshotDiff: { validationStatus: string }) => {
          expect(screenshotDiff.validationStatus).toBe("rejected");
        }
      );

      expectNoGraphQLError(res);
      expect(res.status).toBe(200);

      const apolloServerApp = await createApolloServerApp(apolloServer, {
        user: userAccount.user!,
        account: userAccount,
      });
      res = await request(apolloServerApp)
        .post("/graphql")
        .send({
          query: `{
            project(
              accountSlug: "${teamAccount.slug}",
              projectSlug: "${project.slug}",
            ) {
              build(number: 1) {
                screenshotDiffs(after: 0, first: 10) {
                  edges {
                    validationStatus
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
          validationStatus: "rejected",
        },
        {
          validationStatus: "rejected",
        },
        {
          validationStatus: "rejected",
        },
      ]);
    });

    it("should not mutate when the user is unauthorized", async () => {
      const userAccount = await factory.create<Account>("UserAccount");
      await userAccount.$fetchGraph("user");
      const app = await createApolloServerApp(apolloServer, {
        user: userAccount.user!,
        account: userAccount,
      });
      const res = await request(app)
        .post("/graphql")
        .send({
          query: `
            mutation {
              setValidationStatus(
                buildId: "${build.id}",
                validationStatus: rejected
              ) {
                screenshotDiffs(after: 0, first: 10) {
                  edges {
                    validationStatus
                  }
                }
              }
            }
          `,
        });
      expect(res.status).toBe(200);
      expect(res.body.errors[0].message).toBe(
        "You don't have access to this build"
      );
    });
  });
});
