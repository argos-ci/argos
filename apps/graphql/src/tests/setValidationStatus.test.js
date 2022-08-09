import request from "supertest";
import { useDatabase, factory } from "@argos-ci/database/testing";
import * as notifications from "@argos-ci/build-notification";
import { ScreenshotDiff } from "@argos-ci/database/models";
import { expectNoGraphQLError } from "../testing";
import { apolloServer } from "../apollo";
import { createApolloServerApp } from "./util";

jest.mock("@argos-ci/build-notification");

describe("GraphQL", () => {
  useDatabase();

  beforeAll(() => {
    notifications.pushBuildNotification = jest.fn();
  });

  describe("validationStatus", () => {
    let build;
    let user;
    let repository;
    let screenshot2;

    beforeEach(async () => {
      user = await factory.create("User");
      repository = await factory.create("Repository", { userId: user.id });
      await factory.create("UserRepositoryRight", {
        userId: user.id,
        repositoryId: repository.id,
      });
      build = await factory.create("Build", {
        repositoryId: repository.id,
      });
      const screenshot1 = await factory.create("Screenshot", {
        name: "email_deleted",
      });
      screenshot2 = await factory.create("Screenshot", {
        name: "email_deleted",
      });
      const screenshot3 = await factory.create("Screenshot", {
        name: "email_added",
      });
      await factory.create("ScreenshotDiff", {
        buildId: build.id,
        baseScreenshotId: screenshot1.id,
        compareScreenshotId: screenshot2.id,
        score: 0,
      });
      await factory.create("ScreenshotDiff", {
        buildId: build.id,
        baseScreenshotId: screenshot1.id,
        compareScreenshotId: screenshot2.id,
        score: 0.3,
      });
      await factory.create("ScreenshotDiff", {
        buildId: build.id,
        baseScreenshotId: screenshot3.id,
        compareScreenshotId: screenshot3.id,
        score: 0,
      });
    });

    it("should mutate all the validationStatus", async () => {
      let res = await request(createApolloServerApp(apolloServer, { user }))
        .post("/graphql")
        .send({
          query: `
            mutation {
              setValidationStatus(
                buildId: "${build.id}",
                validationStatus: ${ScreenshotDiff.VALIDATION_STATUSES.rejected}
              ){
                screenshotDiffs {
                  validationStatus
                }
              }
            }
          `,
        });
      if (res.body && res.body.data && res.body.data.screenshotDiffs) {
        res.body.data.screenshotDiffs.forEach((screenshotDiff) => {
          expect(screenshotDiff.validationStatus).toBe(
            ScreenshotDiff.VALIDATION_STATUSES.rejected
          );
        });
      }

      expectNoGraphQLError(res);
      expect(res.status).toBe(200);
      expect(notifications.pushBuildNotification).toBeCalledWith({
        buildId: build.id,
        type: "diff-rejected",
      });

      res = await request(createApolloServerApp(apolloServer, { user }))
        .post("/graphql")
        .send({
          query: `{
            repository(
              ownerLogin: "${user.login}",
              repositoryName: "${repository.name}",
            ) {
              build(number: 1) {
                screenshotDiffs {
                  validationStatus
                }
              }
            }
          }`,
        });
      expectNoGraphQLError(res);
      expect(res.status).toBe(200);
      const { screenshotDiffs } = res.body.data.repository.build;
      expect(screenshotDiffs).toEqual([
        {
          validationStatus: ScreenshotDiff.VALIDATION_STATUSES.rejected,
        },
        {
          validationStatus: ScreenshotDiff.VALIDATION_STATUSES.rejected,
        },
        {
          validationStatus: ScreenshotDiff.VALIDATION_STATUSES.rejected,
        },
      ]);
    });

    it("should not mutate when the user is unauthorized", async () => {
      const user2 = await factory.create("User");
      const res = await request(
        createApolloServerApp(apolloServer, { user: user2 })
      )
        .post("/graphql")
        .send({
          query: `
            mutation {
              setValidationStatus(
                buildId: "${build.id}",
                validationStatus: ${ScreenshotDiff.VALIDATION_STATUSES.rejected}
              ) {
                screenshotDiffs {
                  validationStatus
                }
              }
            }
          `,
        });
      expect(res.status).toBe(200);
      expect(res.body.errors[0].message).toBe("Invalid user authorization");
    });
  });
});
