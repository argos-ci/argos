import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { concludeBuild } from "@/build/concludeBuild.js";
import type {
  Account,
  Build,
  Project,
  Screenshot,
} from "@/database/models/index.js";
import { factory, setupDatabase } from "@/database/testing/index.js";

import { apolloServer, createApolloMiddleware } from "../apollo.js";
import { expectNoGraphQLError } from "../testing.js";
import { createApolloServerApp } from "./util.js";

describe("GraphQL", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  describe("mutation setValidationStatus", () => {
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
      await concludeBuild({ build, notify: false });
      build = await build.$query();
    });

    it("should mutate the build status", async () => {
      const app = await createApolloServerApp(
        apolloServer,
        createApolloMiddleware,
        {
          user: userAccount.user!,
          account: userAccount,
        },
      );
      let res = await request(app)
        .post("/graphql")
        .send({
          query: `
            mutation {
              setValidationStatus(
                buildId: "${build.id}",
                validationStatus: rejected
              ){
                status
              }
            }
          `,
        });
      expect(res.body.data.setValidationStatus.status).toBe("REJECTED");

      expectNoGraphQLError(res);
      expect(res.status).toBe(200);

      const apolloServerApp = await createApolloServerApp(
        apolloServer,
        createApolloMiddleware,
        {
          user: userAccount.user!,
          account: userAccount,
        },
      );
      res = await request(apolloServerApp)
        .post("/graphql")
        .send({
          query: `{
            project(
              accountSlug: "${teamAccount.slug}",
              projectName: "${project.name}",
            ) {
              build(number: 1) {
                status
              }
            }
          }`,
        });
      expectNoGraphQLError(res);
      expect(res.status).toBe(200);
      expect(res.body.data.project.build.status).toBe("REJECTED");
    });

    it("should not mutate when the user is unauthorized", async () => {
      const userAccount = await factory.UserAccount.create();
      await userAccount.$fetchGraph("user");
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
            mutation {
              setValidationStatus(
                buildId: "${build.id}",
                validationStatus: rejected
              ) {
                status
              }
            }
          `,
        });
      expect(res.status).toBe(200);
      expect(res.body.errors[0].message).toBe(
        "You cannot approve or reject this build",
      );
    });
  });
});
