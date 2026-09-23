import { invariant } from "@argos/util/invariant";
import request, { type Response } from "supertest";
import { test as base, beforeEach, describe, expect, vi } from "vitest";

import type {
  Account,
  GithubInstallation,
  Project,
  User,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { getInstallationOctokit } from "@/github/client";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

vi.mock("@/github/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/github/client")>()),
  getInstallationOctokit: vi.fn(),
}));

const privateRepository = {
  id: 424242,
  name: "secret-infra",
  private: true,
  default_branch: "main",
  updated_at: "2026-09-01T00:00:00Z",
  owner: { id: 434343, login: "victim-org", type: "Organization" },
};

// Like the real one, the installation token reaches the repository whoever
// the request is made for: only Argos can refuse it.
beforeEach(() => {
  vi.mocked(getInstallationOctokit).mockResolvedValue({
    apps: {
      listReposAccessibleToInstallation: vi.fn().mockResolvedValue({
        data: { total_count: 1, repositories: [privateRepository] },
      }),
    },
    repos: {
      get: vi.fn().mockResolvedValue({ data: privateRepository }),
    },
  } as any);
});

const RepositoriesQuery = `
  query Repositories($installationId: ID!) {
    ghApiInstallationRepositories(
      installationId: $installationId
      fromAuthUser: false
      page: 1
    ) {
      edges {
        name
        owner_login
      }
    }
  }
`;

const ImportGithubProjectMutation = `
  mutation ImportGithubProject($input: ImportGithubProjectInput!) {
    importGithubProject(input: $input) {
      id
    }
  }
`;

const LinkGithubRepositoryMutation = `
  mutation LinkGithubRepository($input: LinkGithubRepositoryInput!) {
    linkGithubRepository(input: $input) {
      id
    }
  }
`;

type TeamOwner = {
  auth: { user: User; account: Account };
  teamAccount: Account;
};

async function createTeamOwner(): Promise<TeamOwner> {
  const [account, teamAccount] = await Promise.all([
    factory.UserAccount.create(),
    factory.TeamAccount.create(),
  ]);
  invariant(account.userId && teamAccount.teamId);
  await Promise.all([
    factory.TeamUser.create({
      teamId: teamAccount.teamId,
      userId: account.userId,
      userLevel: "owner",
    }),
    account.$fetchGraph("user"),
  ]);
  invariant(account.user);
  return { auth: { user: account.user, account }, teamAccount };
}

async function send(
  owner: TeamOwner,
  query: string,
  variables: Record<string, unknown>,
) {
  const app = await createApolloServerApp(
    apolloServer,
    createApolloMiddleware,
    owner.auth,
  );
  return request(app).post("/graphql").send({ query, variables });
}

function expectForbidden(res: Response) {
  expect(res.body.errors).toMatchObject([
    {
      message: "User does not have access to GitHub installation",
      extensions: { code: "FORBIDDEN" },
    },
  ]);
}

const test = base.extend<{
  fixture: {
    /** Owns the team the light installation was installed from. */
    owner: TeamOwner;
    /** Any other user, owning a team of their own. */
    outsider: TeamOwner;
    outsiderProject: Project;
    lightInstallation: GithubInstallation;
    mainInstallation: GithubInstallation;
  };
}>({
  fixture: async ({}, use) => {
    await setupDatabase();
    const [owner, outsider, lightInstallation, mainInstallation] =
      await Promise.all([
        createTeamOwner(),
        createTeamOwner(),
        factory.GithubInstallation.create({ app: "light" }),
        factory.GithubInstallation.create({ app: "main" }),
      ]);
    const [outsiderProject] = await Promise.all([
      factory.Project.create({ accountId: outsider.teamAccount.id }),
      owner.teamAccount
        .$query()
        .patch({ githubLightInstallationId: lightInstallation.id }),
    ]);
    await use({
      owner,
      outsider,
      outsiderProject,
      lightInstallation,
      mainInstallation,
    });
  },
});

describe("ghApiInstallationRepositories", () => {
  test("lists a light installation's repositories to an admin of its team", async ({
    fixture,
  }) => {
    const res = await send(fixture.owner, RepositoriesQuery, {
      installationId: String(fixture.lightInstallation.githubId),
    });
    expectNoGraphQLError(res);
    expect(res.body.data.ghApiInstallationRepositories.edges).toEqual([
      { name: "secret-infra", owner_login: "victim-org" },
    ]);
  });

  test("does not list them to anyone else", async ({ fixture }) => {
    const res = await send(fixture.outsider, RepositoriesQuery, {
      installationId: String(fixture.lightInstallation.githubId),
    });
    expectForbidden(res);
  });

  test("never lists a main installation's repositories with its own token", async ({
    fixture,
  }) => {
    const res = await send(fixture.outsider, RepositoriesQuery, {
      installationId: String(fixture.mainInstallation.githubId),
    });
    expectForbidden(res);
  });
});

describe("importGithubProject", () => {
  test("imports from the light installation of the team", async ({
    fixture,
  }) => {
    const res = await send(fixture.owner, ImportGithubProjectMutation, {
      input: {
        accountSlug: fixture.owner.teamAccount.slug,
        installationId: String(fixture.lightInstallation.githubId),
        owner: "victim-org",
        repo: "secret-infra",
      },
    });
    expectNoGraphQLError(res);
    expect(res.body.data.importGithubProject.id).toEqual(expect.any(String));
  });

  test("does not import from the light installation of another team", async ({
    fixture,
  }) => {
    const res = await send(fixture.outsider, ImportGithubProjectMutation, {
      input: {
        accountSlug: fixture.outsider.teamAccount.slug,
        installationId: String(fixture.lightInstallation.githubId),
        owner: "victim-org",
        repo: "secret-infra",
      },
    });
    expectForbidden(res);
  });

  test("does not import from a main installation the user cannot see on GitHub", async ({
    fixture,
  }) => {
    const res = await send(fixture.outsider, ImportGithubProjectMutation, {
      input: {
        accountSlug: fixture.outsider.teamAccount.slug,
        installationId: String(fixture.mainInstallation.githubId),
        owner: "victim-org",
        repo: "secret-infra",
      },
    });
    expectForbidden(res);
  });
});

describe("linkGithubRepository", () => {
  test("does not link from the light installation of another team", async ({
    fixture,
  }) => {
    const res = await send(fixture.outsider, LinkGithubRepositoryMutation, {
      input: {
        projectId: fixture.outsiderProject.id,
        installationId: String(fixture.lightInstallation.githubId),
        owner: "victim-org",
        repo: "secret-infra",
      },
    });
    expectForbidden(res);
  });
});
