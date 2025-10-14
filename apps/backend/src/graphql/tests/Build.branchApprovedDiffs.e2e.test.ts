import request from "supertest";
import { test as base, describe, expect } from "vitest";

import { concludeBuild } from "@/build/concludeBuild.js";
import { Account, Artifact, Build, Project } from "@/database/models/index.js";
import { factory, setupDatabase } from "@/database/testing/index.js";

import { apolloServer, createApolloMiddleware } from "../apollo.js";
import { expectNoGraphQLError } from "../testing.js";
import { createApolloServerApp } from "./util.js";

type Fixtures = {
  fixture: {
    userAccount: Account;
    project: Project;
    firstBuild: Build;
    secondBuild: Build;
  };
};

const test = base.extend<Fixtures>({
  fixture: async ({}, use) => {
    await setupDatabase();
    const userAccount = await factory.UserAccount.create();
    const [project] = await Promise.all([
      factory.Project.create({
        accountId: userAccount.id,
      }),
      userAccount.$fetchGraph("user"),
    ]);

    async function createBuild() {
      const baseBucket = await factory.ArtifactBucket.create({
        projectId: project.id,
        branch: "main",
      });
      const baseArtifacts = await factory.Artifact.createMany(3, {
        artifactBucketId: baseBucket.id,
      });
      const headBucket = await factory.ArtifactBucket.create({
        projectId: project.id,
        branch: "main",
      });
      const files = await factory.File.createMany(3, {
        type: "screenshot",
      });
      const headArtifacts = await factory.Artifact.createMany(3, [
        {
          artifactBucketId: headBucket.id,
          fileId: files[0]!.id,
        },
        {
          artifactBucketId: headBucket.id,
          fileId: files[1]!.id,
        },
        {
          artifactBucketId: headBucket.id,
          fileId: files[2]!.id,
        },
      ]);
      const build = await factory.Build.create({
        projectId: project.id,
        conclusion: null,
        baseArtifactBucketId: baseBucket.id,
        headArtifactBucketId: headBucket.id,
      });
      await factory.ArtifactDiff.createMany(3, [
        {
          buildId: build.id,
          baseArtifactId: baseArtifacts[0]!.id,
          headArtifactId: headArtifacts[0]!.id,
          score: 0,
        },
        {
          buildId: build.id,
          baseArtifactId: baseArtifacts[1]!.id,
          headArtifactId: headArtifacts[1]!.id,
          score: 0.3,
        },
        {
          buildId: build.id,
          baseArtifactId: baseArtifacts[2]!.id,
          headArtifactId: headArtifacts[2]!.id,
          score: 0,
        },
      ]);
      await concludeBuild({ build, notify: false });
      const freshBuild = await build
        .$query()
        .withGraphFetched("screenshotDiffs");
      return freshBuild;
    }

    const firstBuild = await createBuild();
    const buildReview = await factory.BuildReview.create({
      buildId: firstBuild.id,
      userId: userAccount.userId!,
      state: "approved",
    });
    await factory.ArtifactDiffReview.createMany(3, [
      {
        buildReviewId: buildReview.id,
        artifactDiffId: firstBuild.artifactDiffs![0]!.id,
        state: "approved",
      },
      {
        buildReviewId: buildReview.id,
        artifactDiffId: firstBuild.artifactDiffs![1]!.id,
        state: "rejected",
      },
      {
        buildReviewId: buildReview.id,
        artifactDiffId: firstBuild.artifactDiffs![2]!.id,
        state: "approved",
      },
    ]);
    const secondBuild = await createBuild();
    const [firstBuildArtifacts, secondBuildArtifacts] = await Promise.all([
      Artifact.query()
        .where("artifactBucketId", firstBuild.headArtifactBucketId)
        .orderBy("id", "desc"),
      Artifact.query()
        .where("artifactBucketId", secondBuild.headArtifactBucketId)
        .orderBy("id", "desc"),
    ]);

    // Copy fileId from first build artifacts to second build artifacts
    await Promise.all(
      firstBuildArtifacts.map(async (a1, i) => {
        const a2 = secondBuildArtifacts[i];
        await a2!.$query().patch({
          fileId: a1.fileId,
        });
      }),
    );

    await use({
      firstBuild,
      secondBuild,
      userAccount,
      project,
    });
  },
});

describe("GraphQL Build.branchApprovedDiffs", () => {
  test("returns approved screenshot diffs", async ({ fixture }) => {
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      {
        user: fixture.userAccount.user!,
        account: fixture.userAccount,
      },
    );
    const result = await request(app)
      .post("/graphql")
      .send({
        query: `
            {
              project(
                accountSlug: "${fixture.userAccount.slug}",
                projectName: "${fixture.project.name}",
              ) {
                build(number: 2) {
                  branchApprovedDiffs
                }
              }
            }
          `,
      });
    expectNoGraphQLError(result);
    expect(result.status).toBe(200);
    const [first, , last] = await fixture.secondBuild
      .$relatedQuery("artifactDiffs")
      .select("id");
    expect(result.body.data.project.build.branchApprovedDiffs.sort()).toEqual(
      [first, last].map((diff) => diff!.id).sort(),
    );
  });
});
