import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const CreateProjectMutation = `
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
      name
      slug
    }
  }
`;

async function createTeamOwner() {
  const userAccount = await factory.UserAccount.create();
  await userAccount.$fetchGraph("user");
  invariant(userAccount.user, "user not fetched");
  invariant(userAccount.userId, "user account has no user");

  const teamAccount = await factory.TeamAccount.create();
  invariant(teamAccount.teamId, "team account has no team");

  await factory.TeamUser.create({
    teamId: teamAccount.teamId,
    userId: userAccount.userId,
    userLevel: "owner",
  });

  return { userAccount, teamAccount, user: userAccount.user };
}

describe("GraphQL createProject", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("creates a project without a Git provider", async () => {
    const { userAccount, teamAccount, user } = await createTeamOwner();

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account: userAccount },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: CreateProjectMutation,
        variables: {
          input: {
            name: "my-standalone-project",
            accountSlug: teamAccount.slug,
          },
        },
      });

    expectNoGraphQLError(res);
    expect(res.body.data.createProject).toMatchObject({
      name: "my-standalone-project",
      slug: `${teamAccount.slug}/my-standalone-project`,
    });

    await expect(
      Project.query().findById(res.body.data.createProject.id),
    ).resolves.toMatchObject({
      name: "my-standalone-project",
      accountId: teamAccount.id,
      githubRepositoryId: null,
      gitlabProjectId: null,
    });
  });

  it("returns a field error when the name is already used", async () => {
    const { userAccount, teamAccount, user } = await createTeamOwner();
    await factory.Project.create({
      accountId: teamAccount.id,
      name: "taken-name",
    });

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account: userAccount },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: CreateProjectMutation,
        variables: {
          input: { name: "taken-name", accountSlug: teamAccount.slug },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].extensions).toMatchObject({
      code: "BAD_USER_INPUT",
      field: "name",
    });
  });

  it("forbids members without admin permission", async () => {
    const { teamAccount } = await createTeamOwner();
    const memberAccount = await factory.UserAccount.create();
    await memberAccount.$fetchGraph("user");
    invariant(memberAccount.user, "user not fetched");
    invariant(memberAccount.userId, "user account has no user");
    await factory.TeamUser.create({
      teamId: teamAccount.teamId!,
      userId: memberAccount.userId,
      userLevel: "member",
    });

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user: memberAccount.user, account: memberAccount },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: CreateProjectMutation,
        variables: {
          input: { name: "no-permission", accountSlug: teamAccount.slug },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].extensions).toMatchObject({ code: "FORBIDDEN" });
  });

  it("requires authentication", async () => {
    const { teamAccount } = await createTeamOwner();

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      null,
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: CreateProjectMutation,
        variables: {
          input: { name: "unauthenticated", accountSlug: teamAccount.slug },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].extensions).toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });
});
