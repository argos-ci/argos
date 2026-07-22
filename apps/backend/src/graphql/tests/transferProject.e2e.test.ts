import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { factory, setupDatabase } from "@/database/testing";
import { notifyDiscord } from "@/discord";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

// The Discord webhook is configured in the test env; stub it so transferring a
// project here doesn't post a real notification.
vi.mock("@/discord", () => ({ notifyDiscord: vi.fn(() => Promise.resolve()) }));

const TransferProjectMutation = `
  mutation TransferProject($input: TransferProjectInput!) {
    transferProject(input: $input) {
      id
      name
      slug
    }
  }
`;

/**
 * Create a user owning both a personal account and a team account, plus a
 * project sitting on the personal account, ready to be transferred.
 */
async function createTransferableProject() {
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

  const project = await factory.Project.create({
    accountId: userAccount.id,
    name: "side-project",
  });

  return { userAccount, teamAccount, user: userAccount.user, project };
}

describe("GraphQL transferProject", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await setupDatabase();
  });

  it("moves the project and notifies Discord when the target is a team", async () => {
    const { userAccount, teamAccount, user, project } =
      await createTransferableProject();

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account: userAccount },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: TransferProjectMutation,
        variables: {
          input: {
            id: project.id,
            name: "shared-project",
            targetAccountId: teamAccount.id,
          },
        },
      });

    expectNoGraphQLError(res);
    expect(res.body.data.transferProject).toMatchObject({
      name: "shared-project",
      slug: `${teamAccount.slug}/shared-project`,
    });

    expect(vi.mocked(notifyDiscord)).toHaveBeenCalledOnce();
    // The source account and the pre-transfer name are both read before the
    // patch overwrites them, so they must survive into the notification.
    const { content } = vi.mocked(notifyDiscord).mock.calls[0]![0];
    expect(content).toContain(userAccount.slug);
    expect(content).toContain("side-project");
    expect(content).toContain(teamAccount.slug);
    expect(content).toContain("shared-project");
  });

  it("stays silent when the project moves back to a personal account", async () => {
    const { userAccount, teamAccount, user } =
      await createTransferableProject();

    const teamProject = await factory.Project.create({
      accountId: teamAccount.id,
      name: "team-project",
    });

    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account: userAccount },
    );

    const res = await request(app)
      .post("/graphql")
      .send({
        query: TransferProjectMutation,
        variables: {
          input: {
            id: teamProject.id,
            name: "team-project",
            targetAccountId: userAccount.id,
          },
        },
      });

    expectNoGraphQLError(res);
    expect(vi.mocked(notifyDiscord)).not.toHaveBeenCalled();
  });
});
