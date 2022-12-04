import request from "supertest";

import type {
  Build,
  Repository,
  Screenshot,
  ScreenshotDiff,
  User,
  UserRepositoryRight,
} from "@argos-ci/database/models";
import { factory, useDatabase } from "@argos-ci/database/testing";

import { apolloServer } from "../apollo.js";
import { expectNoGraphQLError } from "../testing.js";
import { createApolloServerApp } from "./util.js";

describe("GraphQL", () => {
  useDatabase();

  describe("resolveBuild", () => {
    let build: Build;
    let user: User;
    let repository: Repository;
    let screenshot2: Screenshot;

    beforeEach(async () => {
      user = await factory.create<User>("User");
      repository = await factory.create<Repository>("Repository", {
        userId: user.id,
      });
      await factory.create<UserRepositoryRight>("UserRepositoryRight", {
        userId: user.id,
        repositoryId: repository.id,
      });
      build = await factory.create<Build>("Build", {
        repositoryId: repository.id,
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
      const app = await createApolloServerApp(apolloServer, { user });
      const res = await request(app)
        .post("/graphql")
        .send({
          query: `{
            repository(
              ownerLogin: "${user.login}",
              repositoryName: "${repository.name}",
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
        res.body.data.repository.build.screenshotDiffs;
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
