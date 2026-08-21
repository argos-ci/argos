import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import config from "@/config";
import {
  OriginInstallation,
  OriginRepository,
  type Account,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

/**
 * The Cursor Origin integration is merged but not released: it is staff-only.
 * These pin the server side of that, which is the side that matters — the UI
 * hiding the buttons is cosmetic, and a non-staff admin can call the API
 * directly.
 */

const ORIGIN_QUERY = `
  query OriginStaffGate($slug: String!) {
    account(slug: $slug) {
      id
      originInstallUrl
      originInstallation {
        id
        targetSlug
        repositories {
          id
          fullName
        }
      }
    }
  }
`;

const LINK_ORIGIN_REPOSITORY = `
  mutation LinkOriginRepository($projectId: ID!, $originRepositoryId: ID!) {
    linkOriginRepository(
      input: { projectId: $projectId, originRepositoryId: $originRepositoryId }
    ) {
      id
    }
  }
`;

async function createOriginInstallation(account: Account) {
  const installation = await OriginInstallation.query().insertAndFetch({
    originId: `i_${account.id}`,
    targetSlug: "acme",
    targetId: "ns_1",
    repoSelectionMode: "all",
    scopes: [],
    deleted: false,
  });
  const repository = await OriginRepository.query().insertAndFetch({
    originId: `r_${account.id}`,
    name: "secret-repo",
    ownerSlug: "acme",
    ownerId: "ns_1",
    defaultBranch: "main",
    originInstallationId: installation.id,
  });
  await account.$query().patch({ originInstallationId: installation.id });
  return { installation, repository };
}

describe("Cursor Origin staff gate", () => {
  const originalAppId = config.get("origin.appId");

  beforeAll(() => {
    // The install URL is also gated on the app being configured, so it has to
    // be set for the staff case to prove anything.
    config.set("origin.appId", "app_test");
  });

  afterAll(() => {
    config.set("origin.appId", originalAppId);
  });

  beforeEach(async () => {
    await setupDatabase();
  });

  async function setup(options: { staff: boolean }) {
    const user = await factory.User.create({ staff: options.staff });
    const account = await factory.TeamAccount.create();
    invariant(account.teamId, "team account should have a team");
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: user.id,
      userLevel: "owner",
    });
    const { repository } = await createOriginInstallation(account);
    const app = await createApolloServerApp(
      apolloServer,
      createApolloMiddleware,
      { user, account },
    );
    return { user, account, repository, app };
  }

  it("hides the installation and the install URL from a non-staff owner", async () => {
    const { account, app } = await setup({ staff: false });

    const result = await request(app)
      .post("/graphql")
      .send({ query: ORIGIN_QUERY, variables: { slug: account.slug } });

    expectNoGraphQLError(result);
    expect(result.status).toBe(200);
    expect(result.body.data.account).toMatchObject({
      originInstallUrl: null,
      originInstallation: null,
    });
  });

  it("shows the installation and its repositories to staff", async () => {
    const { account, app } = await setup({ staff: true });

    const result = await request(app)
      .post("/graphql")
      .send({ query: ORIGIN_QUERY, variables: { slug: account.slug } });

    expectNoGraphQLError(result);
    expect(result.status).toBe(200);
    expect(result.body.data.account.originInstallUrl).toEqual(
      expect.stringContaining("client_id=app_test"),
    );
    expect(result.body.data.account.originInstallation).toMatchObject({
      targetSlug: "acme",
      repositories: [{ fullName: "acme/secret-repo" }],
    });
  });

  it("refuses to link an Origin repository for a non-staff owner", async () => {
    const { account, repository, app } = await setup({ staff: false });
    const project = await factory.Project.create({ accountId: account.id });

    const result = await request(app)
      .post("/graphql")
      .send({
        query: LINK_ORIGIN_REPOSITORY,
        variables: { projectId: project.id, originRepositoryId: repository.id },
      });

    expect(result.body.errors?.[0]?.message).toBe("Forbidden");
    const reloaded = await project.$query();
    expect(reloaded.originRepositoryId).toBeNull();
  });

  it("links an Origin repository for staff", async () => {
    const { account, repository, app } = await setup({ staff: true });
    const project = await factory.Project.create({ accountId: account.id });

    const result = await request(app)
      .post("/graphql")
      .send({
        query: LINK_ORIGIN_REPOSITORY,
        variables: { projectId: project.id, originRepositoryId: repository.id },
      });

    expectNoGraphQLError(result);
    const reloaded = await project.$query();
    expect(reloaded.originRepositoryId).toBe(repository.id);
  });
});
