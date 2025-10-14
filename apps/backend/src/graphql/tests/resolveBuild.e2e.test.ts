import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import type {
  Account,
  Artifact,
  Build,
  Project,
} from "@/database/models/index.js";
import { factory, setupDatabase } from "@/database/testing/index.js";

import { apolloServer, createApolloMiddleware } from "../apollo.js";
import { expectNoGraphQLError } from "../testing.js";
import { createApolloServerApp } from "./util.js";

describe("GraphQL", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  describe("resolveBuild", () => {
    let userAccount: Account;
    let teamAccount: Account;
    let project: Project;
    let build: Build;
    let artifact2: Artifact;

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
      const artifact1 = await factory.Artifact.create({
        name: "email_deleted",
      });
      artifact2 = await factory.Artifact.create({
        name: "email_deleted",
      });
      const artifact3 = await factory.Artifact.create({
        name: "email_added",
      });
      await factory.ArtifactDiff.createMany(3, [
        {
          buildId: build.id,
          baseArtifactId: artifact1.id,
          headArtifactId: artifact2.id,
          score: 0,
        },
        {
          buildId: build.id,
          baseArtifactId: artifact1.id,
          headArtifactId: artifact2.id,
          score: 0.3,
        },
        {
          buildId: build.id,
          baseArtifactId: artifact1.id,
          headArtifactId: artifact3.id,
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
      expect(screenshotDiffs).toEqual([
        {
          name: "email_deleted",
          status: "changed",
        },
        {
          name: "email_deleted",
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
