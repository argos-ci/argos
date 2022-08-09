import request from "supertest";
import { useDatabase, factory } from "@argos-ci/database/testing";
import { job as buildJob } from "@argos-ci/build";
import { expectNoGraphQLError } from "../testing";
import { apolloServer } from "../apollo";
import { createApolloServerApp } from "./util";

describe("GraphQL", () => {
  useDatabase();

  beforeEach(() => {
    buildJob.push = jest.fn();
  });

  describe("toggleRepository", () => {
    let ctx;

    beforeEach(async () => {
      const [user, organization] = await Promise.all([
        factory.create("User"),
        factory.create("Organization", {
          name: "bar",
        }),
      ]);
      const repository = await factory.create("Repository", {
        name: "foo",
        organizationId: organization.id,
      });
      await Promise.all([
        factory.create("UserRepositoryRight", {
          userId: user.id,
          repositoryId: repository.id,
        }),
        factory.create("UserOrganizationRight", {
          userId: user.id,
          organizationId: organization.id,
        }),
      ]);
      ctx = { user, repository };
    });

    it("should mutate the repository", async () => {
      const res = await request(
        createApolloServerApp(apolloServer, { user: ctx.user })
      )
        .post("/graphql")
        .send({
          query: `
            mutation {
              toggleRepository(
                enabled: true,
                repositoryId: "${ctx.repository.id}"
              ) {
                enabled
                token
              }
            }
          `,
        });
      expectNoGraphQLError(res);
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        toggleRepository: {
          enabled: true,
        },
      });
      expect(buildJob.push.mock.calls.length).toBe(1);
      expect(res.body.data.toggleRepository.token.length).toBe(40);
    });
  });
});
