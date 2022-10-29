import request from "supertest";

import type {
  Build,
  Organization,
  Repository,
  ScreenshotDiff,
  User,
  UserOrganizationRight,
  UserRepositoryRight,
} from "@argos-ci/database/models";
import { factory, useDatabase } from "@argos-ci/database/testing";

import { apolloServer } from "../apollo.js";
import { expectNoGraphQLError } from "../testing.js";
import { createApolloServerApp } from "./util.js";

describe("GraphQL", () => {
  useDatabase();

  describe("queryRepository", () => {
    let user: User;
    let organization: Organization;
    let repository: Repository;

    beforeEach(async () => {
      user = await factory.create<User>("User");
      organization = await factory.create<Organization>("Organization", {
        name: "bar",
      });
      repository = await factory.create<Repository>("Repository", {
        name: "foo",
        organizationId: organization.id,
      });
      await factory.create<UserRepositoryRight>("UserRepositoryRight", {
        userId: user.id,
        repositoryId: repository.id,
      });
      await factory.create<UserOrganizationRight>("UserOrganizationRight", {
        userId: user.id,
        organizationId: organization.id,
      });
    });

    it("should list builds sorted by number", async () => {
      await factory.create<Build>("Build", {
        repositoryId: repository.id,
        createdAt: "2017-02-04T17:14:28.167Z",
      });
      const build = await factory.create<Build>("Build", {
        repositoryId: repository.id,
        createdAt: "2017-02-05T17:14:28.167Z",
      });
      await factory.create<ScreenshotDiff>("ScreenshotDiff", {
        buildId: build.id,
      });
      const app = await createApolloServerApp(apolloServer, { user });
      const res = await request(app)
        .post("/graphql")
        .send({
          query: `{
            repository(
              ownerLogin: "${organization.login}",
              repositoryName: "${repository.name}",
            ) {
              builds(
                first: 2,
                after: 0,
              ) {
                pageInfo {
                  totalCount
                  endCursor
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
      const { builds } = res.body.data.repository;
      expect(builds).toEqual({
        pageInfo: {
          endCursor: 2,
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
