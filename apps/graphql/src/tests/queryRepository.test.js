import request from "supertest";
import { useDatabase, factory } from "@argos-ci/database/testing";
import { expectNoGraphQLError } from "../testing";
import { apolloServer } from "../apollo";
import { createApolloServerApp } from "./util";

jest.mock("@argos-ci/build-notification");

describe("GraphQL", () => {
  useDatabase();

  describe("queryRepository", () => {
    let user;
    let organization;
    let repository;

    beforeEach(async () => {
      user = await factory.create("User");
      organization = await factory.create("Organization", {
        name: "bar",
      });
      repository = await factory.create("Repository", {
        name: "foo",
        organizationId: organization.id,
      });
      await factory.create("UserRepositoryRight", {
        userId: user.id,
        repositoryId: repository.id,
      });
      await factory.create("UserOrganizationRight", {
        userId: user.id,
        organizationId: organization.id,
      });
    });

    it("should list builds sorted by number", async () => {
      await factory.create("Build", {
        repositoryId: repository.id,
        createdAt: "2017-02-04T17:14:28.167Z",
      });
      const build = await factory.create("Build", {
        repositoryId: repository.id,
        createdAt: "2017-02-05T17:14:28.167Z",
      });
      await factory.create("ScreenshotDiff", {
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
            status: "progress",
            createdAt: "2017-02-04T17:14:28.167Z",
          },
        ],
      });
    });
  });
});
