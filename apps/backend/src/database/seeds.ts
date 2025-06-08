import { concludeBuild } from "@/build/concludeBuild.js";

import { Account } from "./models/Account.js";
import { Build } from "./models/Build.js";
import { BuildReview } from "./models/BuildReview.js";
import { File } from "./models/File.js";
import { GithubAccount } from "./models/GithubAccount.js";
import { Plan } from "./models/Plan.js";
import { Project } from "./models/Project.js";
import { Screenshot } from "./models/Screenshot.js";
import { ScreenshotBucket } from "./models/ScreenshotBucket.js";
import { ScreenshotDiff } from "./models/ScreenshotDiff.js";
import { Team } from "./models/Team.js";
import { TeamUser } from "./models/TeamUser.js";
import { Test } from "./models/Test.js";
import { User } from "./models/User.js";

const now = new Date().toISOString();

function duplicate<T>(obj: T, count: number): T[] {
  return Array.from({ length: count }, () => obj);
}

export async function seed() {
  const [smoothTeam, helloTeam] = await Team.query().insertAndFetch([
    { defaultUserLevel: "member" },
    { defaultUserLevel: "member" },
  ]);

  const [gregUser, jeremyUser] = await User.query().insertAndFetch([
    { email: "greg@smooth-code.com" },
    { email: "jeremy@smooth-code.com" },
  ]);

  const [gregGhAccount, jeremyGhAccount] =
    await GithubAccount.query().insertAndFetch([
      {
        githubId: 266302,
        name: "Greg Bergé",
        login: "gregberge",
        email: "greg@smooth-code.com",
        type: "user",
      },
      {
        githubId: 15954562,
        name: "Jeremy SFEZ",
        login: "jsfez",
        email: "jeremy@smooth-code.com",
        type: "user",
      },
    ]);

  const [smoothAccount, helloAccount] = await Account.query().insertAndFetch([
    { teamId: smoothTeam!.id, name: "Smooth", slug: "smooth" },
    { teamId: helloTeam!.id, name: "Hello You", slug: "hello-you" },
  ]);

  const [gregAccount, jeremyAccount] = await Account.query().insertAndFetch([
    {
      userId: gregUser!.id,
      name: "Greg Bergé",
      slug: "gregberge",
      githubAccountId: gregGhAccount!.id,
    },
    {
      userId: jeremyUser!.id,
      name: "Jeremy Sfez",
      slug: "jsfez",
      githubAccountId: jeremyGhAccount!.id,
    },
  ]);

  await TeamUser.query().insert([
    { teamId: smoothTeam!.id, userId: gregUser!.id, userLevel: "owner" },
    { teamId: smoothTeam!.id, userId: jeremyUser!.id, userLevel: "owner" },
    { teamId: helloTeam!.id, userId: gregUser!.id, userLevel: "owner" },
    { teamId: helloTeam!.id, userId: jeremyUser!.id, userLevel: "owner" },
  ]);

  const [bigProject] = await Project.query().insertAndFetch([
    {
      name: "big",
      token: "big-xxx",
      accountId: smoothAccount!.id,
      private: false,
    },
    {
      name: "awesome",
      token: "awesome-xxx",
      accountId: helloAccount!.id,
      defaultBaseBranch: "main",
    },
    {
      name: "zone-51",
      token: "zone-51-xxx",
      accountId: gregAccount!.id,
    },
    {
      name: "lalouland",
      token: "lalouland-xxx",
      accountId: jeremyAccount!.id,
    },
  ]);

  const screenshotBucketProps = {
    name: "default",
    commit: "029b662f3ae57bae7a215301067262c1e95bbc95",
    branch: "main",
    projectId: bigProject!.id,
    createdAt: "2016-12-08T22:59:55Z",
    updatedAt: "2016-12-08T22:59:55Z",
    complete: true,
    valid: true,
    screenshotCount: 0,
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
      key: `dummy-${width}x${height}.png`,
    })),
    ...bearFilesDimensions.map(({ width, height }) => ({
      type: "screenshot" as const,
      width,
      height,
      key: `bear-${width}x${height}.jpg`,
    })),
  ]);

  const dummiesDiffFiles = await File.query().insertAndFetch([
    {
      type: "screenshotDiff" as const,
      width: 375,
      height: 1024,
      key: "diff-1024-to-720.png",
    },
    {
      type: "screenshotDiff" as const,
      width: 375,
      height: 1440,
      key: "diff-1024-to-1440.png",
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

  const build = {
    number: 1,
    name: "main",
    baseScreenshotBucketId: screenshotBuckets[0]!.id,
    compareScreenshotBucketId: screenshotBuckets[1]!.id,
    projectId: bigProject!.id,
    jobStatus: "complete" as const,
    type: "check" as const,
    createdAt: "2016-12-08T22:59:55Z",
    updatedAt: "2016-12-08T22:59:55Z",
  };

  const [
    orphanBuild,
    referenceBuild,
    ,
    ,
    ,
    diffDetectedBuild,
    acceptedBuild,
    rejectedBuild,
    ,
    inProgressBuild,
    failBuild,
    stableBuild,
    ,
    removedBuild,
  ] = await Build.query().insertAndFetch([
    { ...build, number: 1, type: "orphan", baseScreenshotBucketId: null },
    { ...build, number: 2, type: "reference" },
    { ...build, number: 3, jobStatus: "progress" }, // Expired
    { ...build, number: 4, jobStatus: "aborted" },
    { ...build, number: 5, jobStatus: "error" },
    { ...build, number: 6 }, // Diff detected
    { ...build, number: 7 }, // Accepted
    { ...build, number: 8 }, // Rejected
    { ...build, number: 9, jobStatus: "pending" }, // Pending
    { ...build, number: 10 }, // Progress
    { ...build, number: 11 }, // Fail
    { ...build, number: 12 }, // Stable
    { ...build, number: 13 }, // Empty
    { ...build, number: 14 }, // Removed
  ]);

  const defaultScreenshotDiff = {
    baseScreenshotId: screenshots[0]!.id,
    compareScreenshotId: screenshots[1]!.id,
    score: null,
    jobStatus: "complete" as const,
    s3Id: "penelope-diff-transparent.png",
    createdAt: now,
    updatedAt: now,
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
      },
      {
        ...updatedScreenshotDiff,
        s3Id: "diff-1024-to-1440.png",
        baseScreenshotId: mediumDummyScreenshot!.id,
        compareScreenshotId: largeDummyScreenshot!.id,
        fileId: dummiesDiffFiles[1]!.id,
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
      userId: gregUser!.id,
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
        buildScreenshotDiffs[buildId]!.map((screenshotDiff) => {
          return {
            ...screenshotDiff,
            buildId,
          };
        }),
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

  await Plan.query().insert([
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

  const completeBuilds = await Build.query().where("jobStatus", "complete");
  for (const build of completeBuilds) {
    await concludeBuild({ buildId: build.id, notify: false });
  }
}
