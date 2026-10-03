import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, test as base } from "vitest";

import type { Account, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

const test = base.extend<{
  memberAccount: Account;
  project: Project;
}>({
  memberAccount: async ({}, use) => {
    const account = await factory.UserAccount.create();
    await account.$fetchGraph("user");
    await use(account);
  },
  project: async ({ memberAccount }, use) => {
    const teamAccount = await factory.TeamAccount.create();
    invariant(teamAccount.teamId, "team account has no team");
    invariant(memberAccount.userId, "member account has no user");
    await factory.TeamUser.create({
      teamId: teamAccount.teamId,
      userId: memberAccount.userId,
      userLevel: "member",
    });
    const installation = await factory.GithubInstallation.create({
      ipAllowListBlockedAt: new Date().toISOString(),
    });
    const repoInstallation = await factory.GithubRepositoryInstallation.create({
      githubInstallationId: installation.id,
    });
    const project = await factory.Project.create({
      accountId: teamAccount.id,
      githubRepositoryId: repoInstallation.githubRepositoryId,
      private: false,
    });
    await project.$fetchGraph("account");
    await use(project);
  },
});

async function queryBlocked(project: Project, auth: Account | null) {
  invariant(project.account, "account not fetched");
  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    auth?.user ? { user: auth.user, account: auth } : null,
  );
  const res = await request(app)
    .post("/graphql")
    .send({
      query: `{
        project(accountSlug: "${project.account.slug}", projectName: "${project.name}") {
          githubIpAllowListBlock {
            staticIp
            staticIpAddresses
          }
        }
      }`,
    });
  expectNoGraphQLError(res);
  return res.body.data.project.githubIpAllowListBlock;
}

describe("Project.githubIpAllowListBlock", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  test("is disclosed to project members", async ({
    project,
    memberAccount,
  }) => {
    expect(await queryBlocked(project, memberAccount)).toEqual({
      staticIp: false,
      staticIpAddresses: [],
    });
  });

  test("is hidden from visitors of a public project", async ({ project }) => {
    expect(await queryBlocked(project, null)).toBeNull();
  });
});
