import request from "supertest";

import { factory, useDatabase } from "@argos-ci/database/testing";

import { apolloServer } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

describe("GraphQL", () => {
  useDatabase();

  let organization;
  let user;

  describe("resolveOwner", () => {
    beforeEach(async () => {
      user = await factory.create("User");
      organization = await factory.create("Organization", {
        name: "bar1",
      });
      const organization2 = await factory.create("Organization", {
        name: "bar2",
      });
      await factory.create("UserOrganizationRight", {
        userId: user.id,
        organizationId: organization.id,
      });
      const repository1 = await factory.create("Repository", {
        name: "foo1",
        organizationId: organization.id,
      });
      const repository2 = await factory.create("Repository", {
        name: "foo2",
        organizationId: organization2.id,
      });
      const repository3 = await factory.create("Repository", {
        name: "foo3",
        userId: user.id,
      });
      await factory.create("UserRepositoryRight", {
        userId: user.id,
        repositoryId: repository1.id,
      });
      await factory.create("UserRepositoryRight", {
        userId: user.id,
        repositoryId: repository2.id,
      });
      await factory.create("UserRepositoryRight", {
        userId: user.id,
        repositoryId: repository3.id,
      });
    });

    it("should filter the repositories (organization)", async () => {
      const app = await createApolloServerApp(apolloServer, { user });
      const res = await request(app)
        .post("/graphql")
        .send({
          query: `{
          owner(
            login: "${organization.login}",
          ) {
            repositories {
              name
            }
          }
        }`,
        });
      expectNoGraphQLError(res);
      expect(res.status).toBe(200);
      const { repositories } = res.body.data.owner;
      expect(repositories).toEqual([
        {
          name: "foo1",
        },
      ]);
    });

    it("should filter the repositories (user)", async () => {
      const app = await createApolloServerApp(apolloServer, { user });
      const res = await request(app)
        .post("/graphql")
        .send({
          query: `{
          owner(
            login: "${user.login}",
          ) {
            repositories {
              name
            }
          }
        }`,
        });
      expectNoGraphQLError(res);
      expect(res.status).toBe(200);
      const { repositories } = res.body.data.owner;
      expect(repositories).toEqual([
        {
          name: "foo3",
        },
      ]);
    });
  });
});
