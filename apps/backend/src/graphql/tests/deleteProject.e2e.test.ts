import { PROJECT_NAME_MAX_LENGTH } from "@argos/schemas/project";
import { invariant } from "@argos/util/invariant";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  Build,
  BuildReview,
  Project,
  Screenshot,
  type Account,
  type User,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { sendNotification } from "@/notification";

import { apolloServer, createApolloMiddleware } from "../apollo";
import { expectNoGraphQLError } from "../testing";
import { createApolloServerApp } from "./util";

vi.mock("@/notification", () => ({
  sendNotification: vi.fn(),
}));

const mockSendNotification = vi.mocked(sendNotification);

const DeleteProjectMutation = `
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`;

const ProjectQuery = `
  query ProjectQuery($accountSlug: String!, $projectName: String!) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
    }
  }
`;

const AccountProjectsQuery = `
  query AccountProjects($slug: String!) {
    account(slug: $slug) {
      id
      projects(first: 30, after: 0) {
        edges {
          id
          name
        }
      }
    }
  }
`;

const CreateProjectMutation = `
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
      name
    }
  }
`;

/**
 * A team whose owner administers `project`, plus a build carrying the review
 * and screenshot history that deleting the project must not touch.
 */
async function seedProject() {
  const userAccount = await factory.UserAccount.create();
  await userAccount.$fetchGraph("user");
  const { user, userId } = userAccount;
  invariant(user && userId, "user not fetched");

  const teamAccount = await factory.TeamAccount.create();
  invariant(teamAccount.teamId, "team account has no team");
  await factory.TeamUser.create({
    teamId: teamAccount.teamId,
    userId,
    userLevel: "owner",
  });

  const project = await factory.Project.create({
    name: "soft-delete-me",
    accountId: teamAccount.id,
  });
  const bucket = await factory.ScreenshotBucket.create({
    projectId: project.id,
  });
  const build = await factory.Build.create({
    projectId: project.id,
    compareScreenshotBucketId: bucket.id,
  });
  const [screenshot, review] = await Promise.all([
    factory.Screenshot.create({ screenshotBucketId: bucket.id }),
    factory.BuildReview.create({ buildId: build.id, state: "approved" }),
  ]);

  return {
    user,
    userAccount,
    teamAccount,
    project,
    build,
    screenshot,
    review,
  };
}

async function createApp(auth: { user: User; account: Account } | null) {
  return createApolloServerApp(apolloServer, createApolloMiddleware, auth);
}

describe("GraphQL deleteProject", () => {
  beforeEach(async () => {
    await setupDatabase();
    vi.clearAllMocks();
  });

  it("keeps the project's history and only stamps `deletedAt`", async () => {
    const { user, userAccount, project, build, screenshot, review } =
      await seedProject();
    const app = await createApp({ user, account: userAccount });

    const res = await request(app)
      .post("/graphql")
      .send({
        query: DeleteProjectMutation,
        variables: { id: project.id },
      });

    expectNoGraphQLError(res);
    expect(res.body.data.deleteProject).toBe(true);

    // The reason the whole thing exists: a hard delete walked all of these.
    const [stored, builds, reviews, screenshots] = await Promise.all([
      Project.query().findById(project.id),
      Build.query().findById(build.id),
      BuildReview.query().findById(review.id),
      Screenshot.query().findById(screenshot.id),
    ]);
    invariant(stored, "the project row must survive the delete");
    expect(stored.deletedAt).not.toBeNull();
    expect(builds).toBeTruthy();
    expect(reviews).toBeTruthy();
    expect(screenshots).toBeTruthy();
  });

  it("stops serving the project everywhere it was listed", async () => {
    const { user, userAccount, teamAccount, project } = await seedProject();
    const app = await createApp({ user, account: userAccount });

    const before = await request(app)
      .post("/graphql")
      .send({
        query: AccountProjectsQuery,
        variables: { slug: teamAccount.slug },
      });
    expectNoGraphQLError(before);
    expect(before.body.data.account.projects.edges).toHaveLength(1);

    await request(app)
      .post("/graphql")
      .send({
        query: DeleteProjectMutation,
        variables: { id: project.id },
      });

    const [byName, byAccount] = await Promise.all([
      request(app)
        .post("/graphql")
        .send({
          query: ProjectQuery,
          variables: {
            accountSlug: teamAccount.slug,
            projectName: project.name,
          },
        }),
      request(app)
        .post("/graphql")
        .send({
          query: AccountProjectsQuery,
          variables: { slug: teamAccount.slug },
        }),
    ]);

    expectNoGraphQLError(byName);
    expect(byName.body.data.project).toBeNull();
    expectNoGraphQLError(byAccount);
    expect(byAccount.body.data.account.projects.edges).toEqual([]);
  });

  it("frees the project name for a new project", async () => {
    const { user, userAccount, teamAccount, project } = await seedProject();
    const app = await createApp({ user, account: userAccount });

    await request(app)
      .post("/graphql")
      .send({
        query: DeleteProjectMutation,
        variables: { id: project.id },
      });

    // Parked under a prefixed name, so the one it held is genuinely free —
    // rather than merely skipped by the name check.
    await expect(Project.query().findById(project.id)).resolves.toMatchObject({
      name: `deleted-${project.id}-${project.name}`,
    });

    const res = await request(app)
      .post("/graphql")
      .send({
        query: CreateProjectMutation,
        variables: {
          input: { name: project.name, accountSlug: teamAccount.slug },
        },
      });

    expectNoGraphQLError(res);
    // The exact name, not `soft-delete-me-1`.
    expect(res.body.data.createProject.name).toBe(project.name);
  });

  it("keeps the parked name inside the length a project name may be", async () => {
    // The prefix cannot push the name past what `ProjectNameSchema` allows, or
    // the patch that stamps the deletion is the thing that fails validation.
    const { user, userAccount, teamAccount } = await seedProject();
    const longName = "l".repeat(PROJECT_NAME_MAX_LENGTH);
    const project = await factory.Project.create({
      name: longName,
      accountId: teamAccount.id,
    });
    const app = await createApp({ user, account: userAccount });

    const res = await request(app)
      .post("/graphql")
      .send({
        query: DeleteProjectMutation,
        variables: { id: project.id },
      });

    expectNoGraphQLError(res);
    const stored = await Project.query().findById(project.id);
    invariant(stored, "the project row must survive the delete");
    expect(stored.deletedAt).not.toBeNull();
    expect(stored.name).toHaveLength(PROJECT_NAME_MAX_LENGTH);
    expect(stored.name).toBe(
      `deleted-${project.id}-${longName}`.slice(0, PROJECT_NAME_MAX_LENGTH),
    );
  });

  it("refuses a name that could land on a parked one", async () => {
    // The parked prefix has to stay out of the namespace a user can claim, or
    // deleting a project could land it on a name a live one already holds.
    const { user, userAccount, teamAccount } = await seedProject();
    const app = await createApp({ user, account: userAccount });

    const res = await request(app)
      .post("/graphql")
      .send({
        query: CreateProjectMutation,
        variables: {
          input: { name: "deleted-1-web", accountSlug: teamAccount.slug },
        },
      });

    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].message).toBe(
      'A project name cannot start with "deleted-".',
    );
  });

  it("notifies once when two deletes race", async () => {
    // Both requests read a live project before either writes, so only the
    // conditional stamp can tell them apart — a prior existence check cannot.
    const { user, userAccount, project } = await seedProject();
    const app = await createApp({ user, account: userAccount });

    const send = () =>
      request(app)
        .post("/graphql")
        .send({
          query: DeleteProjectMutation,
          variables: { id: project.id },
        });

    const [first, second] = await Promise.all([send(), send()]);

    expectNoGraphQLError(first);
    expectNoGraphQLError(second);
    expect(first.body.data.deleteProject).toBe(true);
    expect(second.body.data.deleteProject).toBe(true);
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    await expect(Project.query().findById(project.id)).resolves.toMatchObject({
      name: `deleted-${project.id}-${project.name}`,
    });
  });

  it("refuses a viewer who does not administer the project", async () => {
    const { teamAccount, project } = await seedProject();
    const outsiderAccount = await factory.UserAccount.create();
    await outsiderAccount.$fetchGraph("user");
    const outsider = outsiderAccount.user;
    invariant(outsider, "user not fetched");
    invariant(teamAccount.teamId, "team account has no team");
    await factory.TeamUser.create({
      teamId: teamAccount.teamId,
      userId: outsider.id,
      userLevel: "contributor",
    });

    const app = await createApp({ user: outsider, account: outsiderAccount });

    const res = await request(app)
      .post("/graphql")
      .send({
        query: DeleteProjectMutation,
        variables: { id: project.id },
      });

    expect(res.body.errors).toHaveLength(1);
    await expect(Project.query().findById(project.id)).resolves.toMatchObject({
      deletedAt: null,
    });
  });

  it("answers a second delete without deleting anything again", async () => {
    const { user, userAccount, project } = await seedProject();
    const app = await createApp({ user, account: userAccount });

    const first = await request(app)
      .post("/graphql")
      .send({
        query: DeleteProjectMutation,
        variables: { id: project.id },
      });
    expectNoGraphQLError(first);
    const stored = await Project.query().findById(project.id);
    invariant(stored, "the project row must survive the delete");
    const { deletedAt } = stored;
    expect(deletedAt).toBeTruthy();

    const second = await request(app)
      .post("/graphql")
      .send({
        query: DeleteProjectMutation,
        variables: { id: project.id },
      });

    expectNoGraphQLError(second);
    expect(second.body.data.deleteProject).toBe(true);
    // Same stamp: the second call found nothing to delete rather than
    // re-deleting and notifying everyone twice.
    await expect(Project.query().findById(project.id)).resolves.toMatchObject({
      deletedAt,
    });
  });
});
