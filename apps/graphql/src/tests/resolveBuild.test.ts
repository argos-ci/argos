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
                screenshotDiffs(offset: 0, limit: 10) {
                  edges {
                    baseScreenshot {
                      name
                    }
                    compareScreenshot {
                      name
                    }
                    score
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
          baseScreenshot: { name: "email_deleted" },
          compareScreenshot: { name: "email_deleted" },
          score: 0.3,
        },
        {
          baseScreenshot: { name: "email_added" },
          compareScreenshot: { name: "email_added" },
          score: 0,
        },
        {
          baseScreenshot: { name: "email_deleted" },
          compareScreenshot: { name: "email_deleted" },
          score: 0,
        },
      ]);
    });

    // @TODO check if it should pass
    it.skip("should also display transitioning diffs", async () => {
      await factory.create<ScreenshotDiff>("ScreenshotDiff", {
        buildId: build.id,
        baseScreenshotId: null,
        compareScreenshotId: screenshot2.id,
        score: null,
      });

      const app = await createApolloServerApp(apolloServer, { user });
      await request(app)
        .post("/graphql")
        .send({
          query: `{
            repository(
              ownerLogin: "${user.login}",
              repositoryName: "${repository.name}",
            ) {
              build(number: 1) {
                screenshotDiffs(where: {passing: false}, offset: 0, limit: 10) {
                  edges {
                    baseScreenshot {
                      name
                    }
                    compareScreenshot {
                      name
                    }
                    score
                  }
                }
              }
            }
          }`,
        })
        .expect(expectNoGraphQLError)
        .expect((res) => {
          const { edges: screenshotDiffs } =
            res.body.data.repository.build.screenshotDiffs;
          expect(screenshotDiffs).toHaveLength(2);
          expect(screenshotDiffs).toEqual([
            {
              baseScreenshot: null,
              compareScreenshot: {
                name: "email_deleted",
              },
              score: null,
            },
            {
              baseScreenshot: {
                name: "email_deleted",
              },
              compareScreenshot: {
                name: "email_deleted",
              },
              score: 0.3,
            },
          ]);
        })
        .expect(200);
    });
  });
});