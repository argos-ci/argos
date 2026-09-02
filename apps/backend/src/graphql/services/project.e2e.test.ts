import { test as base, beforeEach, describe, expect, vi } from "vitest";

import {
  AutomationActionRun,
  AutomationRule,
  AutomationRun,
  Build,
  IgnoredChange,
  MediaDiff,
  Project,
  ProjectDomain,
  ProjectUser,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
  TeamUser,
  Test,
  User,
} from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { deleteDomainTenant } from "@/deployment/cloudfront";
import {
  deleteUnreferencedMediaDiffObjects,
  deleteUnreferencedMediaObjects,
} from "@/media/object";
import { sendNotification } from "@/notification";

import { deleteProject, unsafe_deleteProject } from "./project";

vi.mock("@/notification", () => ({
  sendNotification: vi.fn(),
}));

// Deleting a project drops its media bytes. Nothing here is testing AWS — what
// matters is *which* keys are handed over, because the rows naming them are gone
// by the time this runs and no later pass could find them again.
vi.mock("@/media/object", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/media/object")>()),
  deleteUnreferencedMediaObjects: vi.fn(async () => undefined),
  deleteUnreferencedMediaDiffObjects: vi.fn(async () => undefined),
}));

// Same reason as the media bytes: a CloudFront tenant is billed and is not
// rolled back, so what matters is that its id makes it out of the transaction.
vi.mock("@/deployment/cloudfront", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/deployment/cloudfront")>()),
  deleteDomainTenant: vi.fn(async () => undefined),
}));

type SeededProject = {
  project: Project;
  automationRule: AutomationRule;
  automationRun: AutomationRun;
};

const mockSendNotification = vi.mocked(sendNotification);

const test = base.extend<{
  factory: typeof factory;
  seededProject: SeededProject;
}>({
  factory: async ({}, use) => {
    await setupDatabase();
    await use(factory);
  },
  seededProject: async ({ factory }, use) => {
    const project = await factory.Project.create();
    const compareBucket = await factory.ScreenshotBucket.create({
      projectId: project.id,
    });

    const build = await factory.Build.create({
      projectId: project.id,
      compareScreenshotBucketId: compareBucket.id,
    });

    const [
      slackChannel,
      screenshot,
      _notification,
      review,
      diff,
      fileA,
      fileB,
    ] = await Promise.all([
      factory.SlackChannel.create(),
      factory.Screenshot.create({ screenshotBucketId: compareBucket.id }),
      factory.BuildNotification.create({ buildId: build.id }),
      factory.BuildReview.create({ buildId: build.id, state: "approved" }),
      factory.ScreenshotDiff.create({ buildId: build.id }),
      factory.File.create({
        key: "diff-file-a",
        type: "screenshotDiff",
        fingerprint: "x",
      }),
      factory.File.create({
        key: "diff-file-b",
        type: "screenshotDiff",
        fingerprint: "y",
      }),
    ]);

    const [, createdTest] = await Promise.all([
      factory.ScreenshotDiffReview.create({
        buildReviewId: review.id,
        screenshotDiffId: diff.id,
        state: "approved",
      }),
      factory.Test.create({
        name: screenshot.name,
        projectId: project.id,
        buildName: "default",
      }),
    ]);

    await IgnoredChange.query().insert([
      {
        projectId: project.id,
        testId: createdTest.id,
        fingerprint: fileA.fingerprint!,
      },
      {
        projectId: project.id,
        testId: createdTest.id,
        fingerprint: fileB.fingerprint!,
      },
    ]);

    const automationRule = await factory.AutomationRule.create({
      projectId: project.id,
      on: ["build.completed"],
      then: [
        {
          action: "sendSlackMessage",
          actionPayload: { channelId: slackChannel.id },
        },
      ],
    });

    const automationRun = await factory.AutomationRun.create({
      automationRuleId: automationRule.id,
      buildId: build.id,
    });

    await factory.AutomationActionRun.create({
      automationRunId: automationRun.id,
      action: "sendSlackMessage",
      actionPayload: { channelId: slackChannel.id },
      jobStatus: "pending",
    });

    await use({ project, automationRule, automationRun });
  },
});

describe("unsafe_deleteProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should delete all project-related data", async ({
    seededProject: { project, automationRule, automationRun },
  }) => {
    await unsafe_deleteProject({ projectId: project.id });
    const [
      rules,
      runs,
      actionRuns,
      builds,
      buckets,
      screenshots,
      diffs,
      ignoredChanges,
      tests,
      projects,
    ] = await Promise.all([
      AutomationRule.query().where({ projectId: project.id }),
      AutomationRun.query().where({ automationRuleId: automationRule.id }),
      AutomationActionRun.query().where({
        automationRunId: automationRun.id,
      }),
      Build.query().where({ projectId: project.id }),
      ScreenshotBucket.query().where({ projectId: project.id }),
      Screenshot.query().where({ screenshotBucketId: project.id }),
      ScreenshotDiff.query().where({ buildId: project.id }),
      IgnoredChange.query().where({ projectId: project.id }),
      Test.query().where({ projectId: project.id }),
      Project.query().where({ id: project.id }),
    ]);

    expect(rules).toHaveLength(0);
    expect(runs).toHaveLength(0);
    expect(actionRuns).toHaveLength(0);
    expect(builds).toHaveLength(0);
    expect(buckets).toHaveLength(0);
    expect(screenshots).toHaveLength(0);
    expect(diffs).toHaveLength(0);
    expect(ignoredChanges).toHaveLength(0);
    expect(tests).toHaveLength(0);
    expect(projects).toHaveLength(0);
  });

  test("drops the media bytes, masks included", async ({ factory }) => {
    // The diff masks are derived from the versions and cascade away with them,
    // so their keys have to be read inside the transaction. Reading them after
    // the commit — or not at all — leaves objects in the bucket that nothing
    // references and nothing will ever collect.
    const project = await factory.Project.create();
    const media = await factory.Media.create({ projectId: project.id });
    const [before, after] = await Promise.all([
      factory.MediaVersion.create({
        mediaId: media.id,
        number: 1,
        key: "media/1/before.png",
      }),
      factory.MediaVersion.create({
        mediaId: media.id,
        number: 2,
        key: "media/1/after.png",
      }),
    ]);
    await MediaDiff.query().insert({
      beforeMediaVersionId: before.id,
      afterMediaVersionId: after.id,
      jobStatus: "complete",
      key: "media/1/diffs/mask.png",
    });

    await unsafe_deleteProject({ projectId: project.id });

    expect(deleteUnreferencedMediaObjects).toHaveBeenCalledWith({
      keys: expect.arrayContaining(["media/1/before.png", "media/1/after.png"]),
      excludeVersionIds: [],
    });
    expect(deleteUnreferencedMediaDiffObjects).toHaveBeenCalledWith({
      keys: ["media/1/diffs/mask.png"],
      excludeDiffIds: [],
    });
  });
});

describe("deleteProject", () => {
  beforeEach(async () => {
    await setupDatabase();
    vi.clearAllMocks();
  });

  test("sends a notification to team owners and team contributors with admin access", async () => {
    const [
      owner,
      teamContributorAdmin,
      teamContributorDefaultAdmin,
      teamContributorReviewer,
      member,
    ] = await Promise.all([
      factory.User.create(),
      factory.User.create(),
      factory.User.create(),
      factory.User.create(),
      factory.User.create(),
    ]);
    const account = await factory.TeamAccount.create();
    const project = await factory.Project.create({
      accountId: account.id,
      defaultUserLevel: "admin",
    });

    await Promise.all([
      TeamUser.query().insert({
        teamId: account.teamId!,
        userId: owner.id,
        userLevel: "owner",
      }),
      TeamUser.query().insert({
        teamId: account.teamId!,
        userId: teamContributorAdmin.id,
        userLevel: "contributor",
      }),
      TeamUser.query().insert({
        teamId: account.teamId!,
        userId: teamContributorReviewer.id,
        userLevel: "contributor",
      }),
      TeamUser.query().insert({
        teamId: account.teamId!,
        userId: teamContributorDefaultAdmin.id,
        userLevel: "contributor",
      }),
      TeamUser.query().insert({
        teamId: account.teamId!,
        userId: member.id,
        userLevel: "member",
      }),
      // contributor with explicit admin access must be notified
      ProjectUser.query().insert({
        projectId: project.id,
        userId: teamContributorAdmin.id,
        userLevel: "admin",
      }),
      // contributor without admin access must not be notified
      ProjectUser.query().insert({
        projectId: project.id,
        userId: teamContributorReviewer.id,
        userLevel: "reviewer",
      }),
    ]);

    await deleteProject({ id: project.id, user: owner });

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(mockSendNotification).toHaveBeenCalledWith({
      type: "project_deleted",
      data: {
        accountType: "team",
        accountName: account.name,
        accountSlug: account.slug,
        projectName: project.name,
      },
      recipients: expect.arrayContaining([
        owner.id,
        teamContributorAdmin.id,
        teamContributorDefaultAdmin.id,
      ]),
    });
    const recipients = mockSendNotification.mock.calls[0]?.[0].recipients;
    expect(recipients).toHaveLength(3);
  });

  test("releases the custom domains and their CloudFront tenants", async () => {
    // The one thing a soft delete still drops for real: a tenant is billed for
    // as long as it exists, and the domain has to be free for another project.
    const account = await factory.UserAccount.create();
    const owner = await User.query().findById(account.userId!);
    const project = await factory.Project.create({ accountId: account.id });
    const projectDomain = await factory.ProjectDomain.create({
      projectId: project.id,
      internal: false,
      status: "active",
      cloudfrontTenantId: "dt-tenant-1",
    });

    await deleteProject({ id: project.id, user: owner });

    expect(deleteDomainTenant).toHaveBeenCalledWith("dt-tenant-1");
    await expect(
      ProjectDomain.query().findById(projectDomain.id),
    ).resolves.toBeUndefined();
  });

  test("sends a notification to the personal account owner", async () => {
    const account = await factory.UserAccount.create();
    const owner = await User.query().findById(account.userId!);
    expect(owner).toBeTruthy();

    const project = await factory.Project.create({
      accountId: account.id,
    });

    await deleteProject({ id: project.id, user: owner });

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(mockSendNotification).toHaveBeenCalledWith({
      type: "project_deleted",
      data: {
        accountType: "user",
        accountName: account.name,
        accountSlug: account.slug,
        projectName: project.name,
      },
      recipients: [account.userId!],
    });
  });
});
