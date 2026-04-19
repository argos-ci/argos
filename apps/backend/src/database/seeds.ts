import { invariant } from "@argos/util/invariant";

import { concludeBuild } from "@/build/concludeBuild";

import { UserEmail } from "./models";
import { Account } from "./models/Account";
import { Build } from "./models/Build";
import { BuildReview } from "./models/BuildReview";
import { Deployment } from "./models/Deployment";
import { DeploymentAlias } from "./models/DeploymentAlias";
import { File } from "./models/File";
import { GithubAccount } from "./models/GithubAccount";
import { GithubInstallation } from "./models/GithubInstallation";
import { GithubRepository } from "./models/GithubRepository";
import { GithubRepositoryInstallation } from "./models/GithubRepositoryInstallation";
import { Plan } from "./models/Plan";
import { Project } from "./models/Project";
import { ProjectDomain } from "./models/ProjectDomain";
import { Screenshot } from "./models/Screenshot";
import { ScreenshotBucket } from "./models/ScreenshotBucket";
import { ScreenshotDiff } from "./models/ScreenshotDiff";
import { Team } from "./models/Team";
import { TeamUser } from "./models/TeamUser";
import { Test } from "./models/Test";
import { User } from "./models/User";

function duplicate<T>(obj: T, count: number): T[] {
  return Array.from({ length: count }, () => obj);
}

export async function createUserAccount(input: {
  email: string;
  slug: string;
  name: string;
  githubId?: number;
  /**
   * @default "user"
   */
  type?: "user" | "bot";
}): Promise<{ user: User; account: Account }> {
  const type = input.type ?? "user";
  const [user, githubAccount] = await Promise.all([
    (async () => {
      const user = await User.query().insertAndFetch({
        email: input.email,
        type,
      });
      await UserEmail.query().insert({
        email: input.email,
        verified: true,
        userId: user.id,
      });
      return user;
    })(),
    (async () => {
      if (input.githubId) {
        invariant(type === "user", "A bot can't have a GitHub account");
        return GithubAccount.query().insertAndFetch({
          githubId: input.githubId,
          name: input.name,
          login: input.slug,
          email: input.email,
          type: "user",
        });
      }
      return null;
    })(),
  ]);

  const account = await Account.query().insertAndFetch({
    userId: user.id,
    name: input.name,
    slug: input.slug,
    githubAccountId: githubAccount?.id ?? null,
  });

  return { user, account };
}

export async function createTeamAccount(input: {
  slug: string;
  name: string;
  forcedPlanId?: string | null;
}): Promise<{ team: Team; account: Account }> {
  const team = await Team.query().insertAndFetch({
    defaultUserLevel: "member",
  });
  const account = await Account.query().insertAndFetch({
    teamId: team.id,
    name: input.name,
    slug: input.slug,
    forcedPlanId: input.forcedPlanId ?? null,
  });
  return { team, account };
}

export async function createProject(input: {
  accountId: string;
  name: string;
  token?: string;
  private?: boolean;
  defaultBaseBranch?: string;
}): Promise<Project> {
  return Project.query().insertAndFetch({
    name: input.name,
    token:
      input.token ?? `${input.name}-${Math.random().toString(36).slice(2)}`,
    accountId: input.accountId,
    private: input.private ?? false,
    ...(input.defaultBaseBranch !== undefined && {
      defaultBaseBranch: input.defaultBaseBranch,
    }),
  });
}

export type BuildScenario = {
  orphanBuild: Build;
  referenceBuild: Build;
  expiredBuild: Build;
  abortedBuild: Build;
  errorBuild: Build;
  diffDetectedBuild: Build;
  acceptedBuild: Build;
  rejectedBuild: Build;
  pendingBuild: Build;
  inProgressBuild: Build;
  failBuild: Build;
  stableBuild: Build;
  emptyBuild: Build;
  removedBuild: Build;
};

/**
 * Creates a full set of build scenarios for a given project.
 * Useful for testing build-related UI components.
 *
 * @param keyPrefix - A unique prefix for file keys to avoid conflicts when
 *   calling this function multiple times (e.g. across parallel test workers).
 */
export async function createBuildScenario(input: {
  projectId: string;
  userId?: string;
  keyPrefix?: string;
}): Promise<BuildScenario> {
  const { projectId, keyPrefix = "" } = input;
  const ts = new Date().toISOString();

  const screenshotBucketProps = {
    name: "default",
    commit: "029b662f3ae57bae7a215301067262c1e95bbc95",
    branch: "main",
    projectId,
    createdAt: "2016-12-08T22:59:55Z",
    updatedAt: "2016-12-08T22:59:55Z",
    complete: true,
    valid: true,
    screenshotCount: 0,
    storybookScreenshotCount: 0,
  };

  const screenshotBuckets = await ScreenshotBucket.query().insertAndFetch([
    screenshotBucketProps,
    {
      ...screenshotBucketProps,
      commit: "5a23b6f173d9596a09a73864ab051ea5972e8804",
    },
    {
      ...screenshotBucketProps,
      commit: "2f73c43533f7d36743c0bee5d0b10f746be3f92c",
      branch: "list-item-text-inset-prop",
    },
    {
      ...screenshotBucketProps,
      commit: "1ffac615b85e8a63424252768d21b62381f1b44e",
      branch: "list-item-text-inset-prop",
    },
    {
      ...screenshotBucketProps,
      commit: "852cffe72a964f3783631a0ddc0b51484831363f",
      branch: "list-item-text-inset-prop",
    },
    {
      ...screenshotBucketProps,
      commit: "8fcaca081dcf18815b474d68b3c4952f4adc83cb",
      branch: "list-item-text-inset-prop",
    },
  ]);

  const screenshotsProps = [
    {
      screenshotBucket: screenshotBuckets[0]!,
      name: "penelope.jpg",
      s3Id: "penelope.jpg",
    },
    {
      screenshotBucket: screenshotBuckets[1]!,
      name: "penelope-argos.jpg",
      s3Id: "penelope-argos.jpg",
    },
    {
      screenshotBucket: screenshotBuckets[2]!,
      name: "penelope-argos (failed).jpg",
      s3Id: "penelope-argos.jpg",
    },
  ];

  const tests = await Test.query().insertAndFetch(
    screenshotsProps.map((screenshot) => ({
      name: screenshot.name,
      buildName: "default",
      projectId: screenshot.screenshotBucket.projectId,
    })),
  );

  const screenshots = await Screenshot.query().insertAndFetch(
    screenshotsProps.map((screenshot) => ({
      testId: tests.find((t) => t.name === screenshot.name)!.id,
      name: screenshot.name,
      s3Id: screenshot.s3Id,
      screenshotBucketId: screenshot.screenshotBucket.id,
    })),
  );

  const dummiesFilesDimensions = [
    { width: 375, height: 720 },
    { width: 375, height: 1024 },
    { width: 375, height: 1440 },
  ];

  const bearFilesDimensions = [
    { width: 1280, height: 1024 },
    { width: 1440, height: 1024 },
    { width: 1920, height: 1024 },
    { width: 2560, height: 1024 },
    { width: 320, height: 1024 },
    { width: 375, height: 1024 },
    { width: 425, height: 1024 },
    { width: 768, height: 1024 },
  ];

  const screenshotFiles = await File.query().insertAndFetch([
    ...dummiesFilesDimensions.map(({ width, height }) => ({
      type: "screenshot" as const,
      width,
      height,
      key: `${keyPrefix}dummy-${width}x${height}.png`,
      contentType: "image/png",
    })),
    ...bearFilesDimensions.map(({ width, height }) => ({
      type: "screenshot" as const,
      width,
      height,
      key: `${keyPrefix}bear-${width}x${height}.jpg`,
      contentType: "image/jpeg",
    })),
  ]);

  const dummiesDiffFiles = await File.query().insertAndFetch([
    {
      type: "screenshotDiff" as const,
      width: 375,
      height: 1024,
      key: `${keyPrefix}diff-1024-to-720.png`,
      contentType: "image/png",
    },
    {
      type: "screenshotDiff" as const,
      width: 375,
      height: 1440,
      key: `${keyPrefix}diff-1024-to-1440.png`,
      contentType: "image/png",
    },
  ]);

  const [
    smallDummyScreenshot,
    mediumDummyScreenshot,
    largeDummyScreenshot,
    ...bearScreenshots
  ] = await Screenshot.query().insertAndFetch(
    screenshotFiles.map((file) => ({
      screenshotBucketId: screenshotBuckets[1]!.id,
      name: file.key,
      s3Id: file.key,
      fileId: file.id,
    })),
  );

  const bearScreenshotIds = bearScreenshots.map(({ id }) => id);

  const buildBase = {
    name: "main",
    baseScreenshotBucketId: screenshotBuckets[0]!.id,
    compareScreenshotBucketId: screenshotBuckets[1]!.id,
    projectId,
    jobStatus: "complete" as const,
    type: "check" as const,
    createdAt: "2016-12-08T22:59:55Z",
    updatedAt: "2016-12-08T22:59:55Z",
  };

  const [
    orphanBuild,
    referenceBuild,
    expiredBuild,
    abortedBuild,
    errorBuild,
    diffDetectedBuild,
    acceptedBuild,
    rejectedBuild,
    pendingBuild,
    inProgressBuild,
    failBuild,
    stableBuild,
    emptyBuild,
    removedBuild,
  ] = await Build.query().insertAndFetch([
    { ...buildBase, number: 1, type: "orphan", baseScreenshotBucketId: null },
    { ...buildBase, number: 2, type: "reference" },
    { ...buildBase, number: 3, jobStatus: "progress" }, // Expired
    { ...buildBase, number: 4, jobStatus: "aborted" },
    { ...buildBase, number: 5, jobStatus: "error" },
    { ...buildBase, number: 6 }, // Diff detected
    { ...buildBase, number: 7 }, // Accepted
    { ...buildBase, number: 8 }, // Rejected
    { ...buildBase, number: 9, jobStatus: "pending" }, // Pending/Scheduled
    { ...buildBase, number: 10 }, // In progress (diffs pending)
    { ...buildBase, number: 11 }, // Fail
    { ...buildBase, number: 12 }, // Stable
    { ...buildBase, number: 13 }, // Empty
    { ...buildBase, number: 14 }, // Removed
  ]);

  const defaultScreenshotDiff = {
    baseScreenshotId: screenshots[0]!.id,
    compareScreenshotId: screenshots[1]!.id,
    score: null,
    jobStatus: "complete" as const,
    s3Id: "penelope-diff-transparent.png",
    createdAt: ts,
    updatedAt: ts,
  };

  const stableScreenshotDiff = {
    ...defaultScreenshotDiff,
    s3Id: null,
    score: 0,
  };

  const addedScreenshotDiff = {
    ...defaultScreenshotDiff,
    baseScreenshotId: null,
    s3Id: null,
    score: null,
  };

  const updatedScreenshotDiff = {
    ...defaultScreenshotDiff,
    score: 0.3,
  };

  const removedScreenshotDiff = {
    ...defaultScreenshotDiff,
    compareScreenshotId: null,
  };

  const failedScreenshotDiff = {
    ...addedScreenshotDiff,
    compareScreenshotId: screenshots[2]!.id,
  };

  const buildScreenshotDiffs = {
    [orphanBuild!.id]: duplicate(addedScreenshotDiff, 3),
    [referenceBuild!.id]: [
      ...duplicate(addedScreenshotDiff, 2),
      ...duplicate(stableScreenshotDiff, 3),
    ],
    [diffDetectedBuild!.id]: [
      ...duplicate(stableScreenshotDiff, 2),
      ...duplicate(failedScreenshotDiff, 2),
      ...duplicate(removedScreenshotDiff, 2),
      ...bearScreenshotIds.map((id) => ({
        ...addedScreenshotDiff,
        compareScreenshotId: id,
      })),
      {
        ...updatedScreenshotDiff,
        s3Id: "diff-1024-to-720.png",
        baseScreenshotId: mediumDummyScreenshot!.id,
        compareScreenshotId: smallDummyScreenshot!.id,
        fileId: dummiesDiffFiles[0]!.id,
        testId: smallDummyScreenshot!.testId,
      },
      {
        ...updatedScreenshotDiff,
        s3Id: "diff-1024-to-1440.png",
        baseScreenshotId: mediumDummyScreenshot!.id,
        compareScreenshotId: largeDummyScreenshot!.id,
        fileId: dummiesDiffFiles[1]!.id,
        testId: largeDummyScreenshot!.testId,
      },
      ...duplicate(
        { ...updatedScreenshotDiff, group: updatedScreenshotDiff.s3Id },
        4,
      ),
    ],
    [acceptedBuild!.id]: [
      { ...addedScreenshotDiff },
      ...duplicate({ ...stableScreenshotDiff }, 3),
      ...duplicate({ ...updatedScreenshotDiff }, 2),
    ],
    [rejectedBuild!.id]: [
      { ...addedScreenshotDiff },
      ...duplicate({ ...stableScreenshotDiff }, 3),
      ...duplicate({ ...updatedScreenshotDiff }, 3),
    ],
    [inProgressBuild!.id]: [
      { ...updatedScreenshotDiff, jobStatus: "pending" as const },
    ],
    [failBuild!.id]: [
      ...duplicate(stableScreenshotDiff, 3),
      failedScreenshotDiff,
    ],
    [stableBuild!.id]: duplicate(stableScreenshotDiff, 3),
    [removedBuild!.id]: [
      ...duplicate(stableScreenshotDiff, 3),
      ...duplicate(removedScreenshotDiff, 2),
    ],
  };

  await BuildReview.query().insert([
    {
      buildId: acceptedBuild!.id,
      userId: input.userId ?? null,
      state: "approved",
    },
    {
      buildId: rejectedBuild!.id,
      userId: null,
      state: "rejected",
    },
  ]);

  const screenshotDiffs = await ScreenshotDiff.query()
    .withGraphFetched("compareScreenshot.test")
    .insertAndFetch(
      Object.keys(buildScreenshotDiffs).flatMap((buildId) =>
        buildScreenshotDiffs[buildId]!.map((screenshotDiff) => ({
          ...screenshotDiff,
          buildId,
        })),
      ),
    );

  await Promise.all(
    screenshotDiffs.map(async ({ id, compareScreenshot }) => {
      if (compareScreenshot?.test?.id) {
        await ScreenshotDiff.query()
          .findById(id)
          .patch({ testId: compareScreenshot.test.id });
      }
    }),
  );

  const completeBuilds = [
    orphanBuild,
    referenceBuild,
    diffDetectedBuild,
    acceptedBuild,
    rejectedBuild,
    inProgressBuild,
    failBuild,
    stableBuild,
    emptyBuild,
    removedBuild,
  ].filter((b): b is Build => b?.jobStatus === "complete");

  for (const b of completeBuilds) {
    await concludeBuild({ build: b, notify: false });
  }

  return {
    orphanBuild: orphanBuild!,
    referenceBuild: referenceBuild!,
    expiredBuild: expiredBuild!,
    abortedBuild: abortedBuild!,
    errorBuild: errorBuild!,
    diffDetectedBuild: diffDetectedBuild!,
    acceptedBuild: acceptedBuild!,
    rejectedBuild: rejectedBuild!,
    pendingBuild: pendingBuild!,
    inProgressBuild: inProgressBuild!,
    failBuild: failBuild!,
    stableBuild: stableBuild!,
    emptyBuild: emptyBuild!,
    removedBuild: removedBuild!,
  };
}

export async function createDeploymentScenario(input: {
  projectId: string;
  accountSlug: string;
  projectName: string;
}) {
  const { projectId, accountSlug, projectName } = input;
  const readyPreviewTs = "2026-04-18T10:00:00.000Z";
  const readyProductionTs = "2026-04-18T12:00:00.000Z";
  const pendingPreviewTs = "2026-04-19T08:00:00.000Z";
  const errorPreviewTs = "2026-04-19T07:00:00.000Z";

  const productionDomain = await ProjectDomain.query().insertAndFetch({
    projectId,
    domain: `${projectName}-${accountSlug}.dev.argos-ci.live`,
    environment: "production",
    branch: null,
    internal: true,
  });

  const [
    readyPreviewDeployment,
    readyProductionDeployment,
    pendingPreviewDeployment,
    errorPreviewDeployment,
  ] = await Deployment.query().insertAndFetch([
    {
      projectId,
      status: "ready",
      environment: "preview",
      branch: "preview-main",
      commitSha: "5a23b6f173d9596a09a73864ab051ea5972e8804",
      slug: `${projectName}-preview-main`,
      createdAt: readyPreviewTs,
      updatedAt: readyPreviewTs,
      githubPullRequestId: null,
    },
    {
      projectId,
      status: "ready",
      environment: "production",
      branch: "main",
      commitSha: "029b662f3ae57bae7a215301067262c1e95bbc95",
      slug: `${projectName}-production`,
      createdAt: readyProductionTs,
      updatedAt: readyProductionTs,
      githubPullRequestId: null,
    },
    {
      projectId,
      status: "pending",
      environment: "preview",
      branch: "list-item-text-inset-prop",
      commitSha: "1ffac615b85e8a63424252768d21b62381f1b44e",
      slug: `${projectName}-list-item-text-inset-prop-pending`,
      createdAt: pendingPreviewTs,
      updatedAt: pendingPreviewTs,
      githubPullRequestId: null,
    },
    {
      projectId,
      status: "error",
      environment: "preview",
      branch: "list-item-text-inset-prop",
      commitSha: "852cffe72a964f3783631a0ddc0b51484831363f",
      slug: `${projectName}-list-item-text-inset-prop-error`,
      createdAt: errorPreviewTs,
      updatedAt: errorPreviewTs,
      githubPullRequestId: null,
    },
  ]);

  invariant(readyPreviewDeployment, "readyPreviewDeployment not found");
  invariant(readyProductionDeployment, "readyProductionDeployment not found");
  invariant(pendingPreviewDeployment, "pendingPreviewDeployment not found");
  invariant(errorPreviewDeployment, "errorPreviewDeployment not found");

  await DeploymentAlias.query().insert([
    {
      deploymentId: readyPreviewDeployment.id,
      alias: `${projectName}-preview-main-${accountSlug}`,
      type: "branch",
      createdAt: readyPreviewTs,
      updatedAt: readyPreviewTs,
    },
    {
      deploymentId: readyProductionDeployment.id,
      alias: `${projectName}-main-${accountSlug}`,
      type: "branch",
      createdAt: readyProductionTs,
      updatedAt: readyProductionTs,
    },
    {
      deploymentId: readyProductionDeployment.id,
      alias: productionDomain.domain,
      type: "domain",
      createdAt: readyProductionTs,
      updatedAt: readyProductionTs,
    },
    {
      deploymentId: pendingPreviewDeployment.id,
      alias: `${projectName}-list-item-text-inset-prop-${accountSlug}`,
      type: "branch",
      createdAt: pendingPreviewTs,
      updatedAt: pendingPreviewTs,
    },
    {
      deploymentId: errorPreviewDeployment.id,
      alias: `${projectName}-list-item-text-inset-prop-failed-${accountSlug}`,
      type: "branch",
      createdAt: errorPreviewTs,
      updatedAt: errorPreviewTs,
    },
  ]);
}

export async function seed() {
  const plans = await Plan.query().insert([
    {
      name: "free",
      includedScreenshots: 7000,
      githubPlanId: 7772,
      usageBased: false,
      githubSsoIncluded: true,
      fineGrainedAccessControlIncluded: true,
      interval: "month",
    },
    {
      name: "starter",
      includedScreenshots: 40000,
      githubPlanId: 7786,
      stripeProductId: "prod_MzEZEfBDYFIc53",
      usageBased: false,
      githubSsoIncluded: true,
      fineGrainedAccessControlIncluded: true,
      interval: "month",
    },
    {
      name: "standard",
      includedScreenshots: 250000,
      githubPlanId: 7787,
      stripeProductId: "prod_MzEavomA8VeCvW",
      usageBased: false,
      githubSsoIncluded: true,
      fineGrainedAccessControlIncluded: true,
      interval: "month",
    },
    {
      name: "Pro (legacy)",
      includedScreenshots: 1000000,
      githubPlanId: 7788,
      stripeProductId: "prod_MzEawyq1kFcHEn",
      usageBased: false,
      githubSsoIncluded: true,
      fineGrainedAccessControlIncluded: true,
      interval: "month",
    },
    {
      name: "pro",
      includedScreenshots: 15000,
      githubPlanId: null,
      stripeProductId: "prod_Njgin72JdGT9Yu",
      usageBased: true,
      githubSsoIncluded: true,
      fineGrainedAccessControlIncluded: true,
      interval: "month",
    },
  ]);

  const [greg, jeremy] = await Promise.all([
    createUserAccount({
      email: "greg@smooth-code.com",
      name: "Greg Bergé",
      slug: "gregberge",
      githubId: 266302,
    }),
    createUserAccount({
      email: "jeremy@smooth-code.com",
      name: "Jeremy Sfez",
      slug: "jsfez",
      githubId: 15954562,
    }),
    createUserAccount({
      email: "argos-bot@no-reply.argos-ci.com",
      name: "Argos Bot",
      slug: "argos-bot",
    }),
  ]);

  const argosGhAccount = await GithubAccount.query().insertAndFetch({
    githubId: 24552866,
    name: "Argos",
    login: "argos-ci",
    email: null,
    type: "organization",
  });

  const { team: smoothTeam, account: smoothAccount } = await createTeamAccount({
    slug: "smooth",
    name: "Smooth",
    forcedPlanId: plans[0]!.id,
  });

  const { team: helloTeam, account: helloAccount } = await createTeamAccount({
    slug: "hello-you",
    name: "Hello You",
  });

  await TeamUser.query().insert([
    { teamId: smoothTeam.id, userId: greg.user.id, userLevel: "owner" },
    { teamId: smoothTeam.id, userId: jeremy.user.id, userLevel: "owner" },
    { teamId: helloTeam.id, userId: greg.user.id, userLevel: "owner" },
    { teamId: helloTeam.id, userId: jeremy.user.id, userLevel: "owner" },
  ]);

  const bigProject = await createProject({
    name: "big",
    token: "big-650ded7d72e85b52e099df6e56aa204d4fe9",
    accountId: smoothAccount.id,
    private: false,
  });

  await Promise.all([
    createProject({
      name: "awesome",
      token: "awesome-650ded7d72e85b52e099df6e56aa204d",
      accountId: helloAccount.id,
      defaultBaseBranch: "main",
    }),
    createProject({
      name: "zone-51",
      token: "zone-51-650ded7d72e85b52e099df6e56aa204d",
      accountId: greg.account.id,
    }),
    createProject({
      name: "lalouland",
      token: "lalouland-650ded7d72e85b52e099df6e56aa20",
      accountId: jeremy.account.id,
    }),
  ]);

  const ghInstallation = await GithubInstallation.query().insertAndFetch({
    createdAt: "2016-12-08T22:59:55Z",
    updatedAt: "2016-12-08T22:59:55Z",
    githubId: 70324597,
    deleted: false,
    githubTokenExpiresAt: "2025-06-08 07:39:55+00",
    app: "main",
    proxy: false,
  });

  const argosTestRepositoryGhRepository =
    await GithubRepository.query().insertAndFetch({
      name: "argos-test-repository",
      private: false,
      defaultBranch: "main",
      githubId: 123456789,
      githubAccountId: argosGhAccount!.id,
      createdAt: "2016-12-08T22:59:55Z",
      updatedAt: "2016-12-08T22:59:55Z",
    });

  await GithubRepositoryInstallation.query().insertAndFetch({
    githubRepositoryId: argosTestRepositoryGhRepository!.id,
    githubInstallationId: ghInstallation!.id,
    createdAt: "2016-12-08T22:59:55Z",
    updatedAt: "2016-12-08T22:59:55Z",
  });

  await createBuildScenario({
    projectId: bigProject.id,
    userId: greg.user.id,
  });

  await createDeploymentScenario({
    projectId: bigProject.id,
    accountSlug: smoothAccount.slug,
    projectName: bigProject.name,
  });
}
