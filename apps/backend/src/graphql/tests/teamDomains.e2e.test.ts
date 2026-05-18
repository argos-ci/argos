import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { generateAuthEmailCode } from "@/auth/email";
import { Team, TeamDomain, TeamUser } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

async function createUserAccount() {
  const userAccount = await factory.UserAccount.create();
  await userAccount.$fetchGraph("user");
  invariant(userAccount.user, "user not fetched");
  invariant(userAccount.userId, "user account has no user");
  return {
    account: userAccount,
    user: userAccount.user,
    userId: userAccount.userId,
  };
}

async function createTeamDomain(domain: string) {
  const teamAccount = await factory.TeamAccount.create();
  invariant(teamAccount.teamId, "team account has no team");
  await factory.TeamDomain.create({
    teamId: teamAccount.teamId,
    domain,
  });
  return teamAccount;
}

describe("GraphQL team domains", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  it("lists auto-invites for verified email domains and excludes joined teams", async () => {
    const { account, user, userId } = await createUserAccount();
    await factory.UserEmail.create({
      userId,
      email: "jane@example.com",
      verified: true,
    });
    await factory.UserEmail.create({
      userId,
      email: "jane@other.com",
      verified: false,
    });

    const eligibleTeamAccount = await createTeamDomain("example.com");
    const joinedTeamAccount = await createTeamDomain("example.com");
    invariant(joinedTeamAccount.teamId, "joined team account has no team");
    await factory.TeamUser.create({
      teamId: joinedTeamAccount.teamId,
      userId,
      userLevel: "member",
    });
    await createTeamDomain("other.com");

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: `
          query TeamDomainsAutoInvites {
            autoInvites {
              email
              domain
              team {
                id
              }
            }
          }
        `,
      });

    expectNoGraphQLError(res);
    expect(res.body.data.autoInvites).toEqual([
      {
        email: "jane@example.com",
        domain: "example.com",
        team: {
          id: eligibleTeamAccount.id,
        },
      },
    ]);
  });

  it("does not match parent domains against subdomain emails", async () => {
    const { account, user, userId } = await createUserAccount();
    await factory.UserEmail.create({
      userId,
      email: "jane@foo.example.com",
      verified: true,
    });
    await createTeamDomain("example.com");

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: `
          query TeamDomainsAutoInvites {
            autoInvites {
              id
            }
          }
        `,
      });

    expectNoGraphQLError(res);
    expect(res.body.data.autoInvites).toEqual([]);
  });

  it("lets a user join a team with an auto-invite", async () => {
    const { account, user, userId } = await createUserAccount();
    await factory.UserEmail.create({
      userId,
      email: "jane@example.com",
      verified: true,
    });
    const teamAccount = await createTeamDomain("example.com");
    invariant(teamAccount.teamId, "team account has no team");
    await Team.query().findById(teamAccount.teamId).patch({
      defaultUserLevel: "contributor",
    });

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation JoinTeam($teamAccountId: ID!) {
            joinTeam(teamAccountId: $teamAccountId) {
              id
            }
          }
        `,
        variables: {
          teamAccountId: teamAccount.id,
        },
      });

    expectNoGraphQLError(res);
    expect(res.body.data.joinTeam).toEqual({
      id: teamAccount.id,
    });

    await expect(
      TeamUser.query().findOne({
        userId,
        teamId: teamAccount.teamId,
      }),
    ).resolves.toMatchObject({
      userLevel: "contributor",
    });
  });

  it("only returns the auth auto-invite flag for new accounts", async () => {
    await createTeamDomain("example.com");
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      null,
    );

    const signupCode = await generateAuthEmailCode("new@example.com");
    const signupRes = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation AuthenticateWithEmail($input: AuthFromEmailInput!) {
            authenticateWithEmail(input: $input) {
              creation
              hasAutoInvite
            }
          }
        `,
        variables: {
          input: {
            email: "new@example.com",
            code: signupCode,
          },
        },
      });

    expectNoGraphQLError(signupRes);
    expect(signupRes.body.data.authenticateWithEmail).toEqual({
      creation: true,
      hasAutoInvite: true,
    });

    const { userId } = await createUserAccount();
    await factory.UserEmail.create({
      userId,
      email: "existing@example.com",
      verified: true,
    });

    const loginCode = await generateAuthEmailCode("existing@example.com");
    const loginRes = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation AuthenticateWithEmail($input: AuthFromEmailInput!) {
            authenticateWithEmail(input: $input) {
              creation
              hasAutoInvite
            }
          }
        `,
        variables: {
          input: {
            email: "existing@example.com",
            code: loginCode,
          },
        },
      });

    expectNoGraphQLError(loginRes);
    expect(loginRes.body.data.authenticateWithEmail).toEqual({
      creation: false,
      hasAutoInvite: false,
    });
  });

  it("adds and removes team domains as a team owner", async () => {
    const { account, user, userId } = await createUserAccount();
    await factory.UserEmail.create({
      userId,
      email: "owner@example.com",
      verified: true,
    });
    const teamAccount = await factory.TeamAccount.create();
    invariant(teamAccount.teamId, "team account has no team");
    await factory.TeamUser.create({
      teamId: teamAccount.teamId,
      userId,
      userLevel: "owner",
    });

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account },
    );

    const addRes = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation AddTeamDomain($input: AddTeamDomainInput!) {
            addTeamDomain(input: $input) {
              id
              teamDomains {
                id
                domain
              }
            }
          }
        `,
        variables: {
          input: {
            teamAccountId: teamAccount.id,
            domain: "EXAMPLE.com",
          },
        },
      });

    expectNoGraphQLError(addRes);
    expect(addRes.body.data.addTeamDomain.teamDomains).toEqual([
      {
        id: expect.any(String),
        domain: "example.com",
      },
    ]);

    const duplicateRes = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation AddTeamDomain($input: AddTeamDomainInput!) {
            addTeamDomain(input: $input) {
              id
            }
          }
        `,
        variables: {
          input: {
            teamAccountId: teamAccount.id,
            domain: "example.com",
          },
        },
      });

    expect(duplicateRes.status).toBe(200);
    expect(duplicateRes.body.errors).toHaveLength(1);
    expect(duplicateRes.body.errors[0].message).toBe(
      "This domain is already linked to this team",
    );
    expect(duplicateRes.body.errors[0].extensions).toMatchObject({
      code: "BAD_USER_INPUT",
      field: "domain",
    });

    const missingEmailRes = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation AddTeamDomain($input: AddTeamDomainInput!) {
            addTeamDomain(input: $input) {
              id
            }
          }
        `,
        variables: {
          input: {
            teamAccountId: teamAccount.id,
            domain: "other.com",
          },
        },
      });

    expect(missingEmailRes.status).toBe(200);
    expect(missingEmailRes.body.errors).toHaveLength(1);
    expect(missingEmailRes.body.errors[0].message).toBe(
      "You must have a verified email address matching this domain",
    );
    expect(missingEmailRes.body.errors[0].extensions).toMatchObject({
      code: "BAD_USER_INPUT",
      field: "domain",
    });

    const teamDomain = await TeamDomain.query()
      .findOne({
        teamId: teamAccount.teamId,
        domain: "example.com",
      })
      .throwIfNotFound();

    const removeRes = await request(app)
      .post("/graphql")
      .send({
        query: `
          mutation RemoveTeamDomain($input: RemoveTeamDomainInput!) {
            removeTeamDomain(input: $input) {
              id
              teamDomains {
                id
                domain
              }
            }
          }
        `,
        variables: {
          input: {
            teamDomainId: teamDomain.id,
          },
        },
      });

    expectNoGraphQLError(removeRes);
    expect(removeRes.body.data.removeTeamDomain.teamDomains).toEqual([]);
  });
});
