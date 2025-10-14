import { concludeBuild } from "@/build/concludeBuild";

import { Account } from "./models/Account";
import { Artifact } from "./models/Artifact";
import { ArtifactBucket } from "./models/ArtifactBucket";
import { ArtifactDiff } from "./models/ArtifactDiff";
import { Build } from "./models/Build";
import { BuildReview } from "./models/BuildReview";
import { File } from "./models/File";
import { GithubAccount } from "./models/GithubAccount";
import { GithubInstallation } from "./models/GithubInstallation";
import { GithubRepository } from "./models/GithubRepository";
import { GithubRepositoryInstallation } from "./models/GithubRepositoryInstallation";
import { Plan } from "./models/Plan";
import { Project } from "./models/Project";
import { Team } from "./models/Team";
import { TeamUser } from "./models/TeamUser";
import { Test } from "./models/Test";
import { User } from "./models/User";

const now = new Date().toISOString();

function duplicate<T>(obj: T, count: number): T[] {
  return Array.from({ length: count }, () => obj);
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

  const [smoothTeam, helloTeam] = await Team.query().insertAndFetch([
    { defaultUserLevel: "member" },
    { defaultUserLevel: "member" },
  ]);

  const [gregUser, jeremyUser] = await User.query().insertAndFetch([
    { email: "greg@smooth-code.com" },
    { email: "jeremy@smooth-code.com" },
  ]);

  const [gregGhAccount, jeremyGhAccount, argosGhAccount] =
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
      {
        githubId: 24552866,
        name: "Argos",
        login: "argos-ci",
        email: null,
        type: "organization",
      },
    ]);

  const [smoothAccount, helloAccount] = await Account.query().insertAndFetch([
    {
      teamId: smoothTeam!.id,
      name: "Smooth",
      slug: "smooth",
      forcedPlanId: plans[0]!.id,
    },
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
      token: "big-650ded7d72e85b52e099df6e56aa204d4fe9",
      accountId: smoothAccount!.id,
      private: false,
    },
    {
      name: "awesome",
      token: "awesome-650ded7d72e85b52e099df6e56aa204d",
      accountId: helloAccount!.id,
      defaultBaseBranch: "main",
    },
    {
      name: "zone-51",
      token: "zone-51-650ded7d72e85b52e099df6e56aa204d",
      accountId: gregAccount!.id,
    },
    {
      name: "lalouland",
      token: "lalouland-650ded7d72e85b52e099df6e56aa20",
      accountId: jeremyAccount!.id,
    },
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
    storybookArtifactCount: 0,
  };

  const screenshotBuckets = await ArtifactBucket.query().insertAndFetch([
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

  const screenshots = await Artifact.query().insertAndFetch(
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
    smallDummyArtifact,
    mediumDummyArtifact,
    largeDummyArtifact,
    ...bearArtifacts
  ] = await Artifact.query().insertAndFetch(
    screenshotFiles.map((file) => ({
      screenshotBucketId: screenshotBuckets[1]!.id,
      name: file.key,
      s3Id: file.key,
      fileId: file.id,
    })),
  );

  const bearArtifactIds = bearArtifacts.map(({ id }) => id);

  const build = {
    number: 1,
    name: "main",
    baseArtifactBucketId: screenshotBuckets[0]!.id,
    headArtifactBucketId: screenshotBuckets[1]!.id,
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
    { ...build, number: 1, type: "orphan", baseArtifactBucketId: null },
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

  const defaultArtifactDiff = {
    baseArtifactId: screenshots[0]!.id,
    headArtifactId: screenshots[1]!.id,
    score: null,
    jobStatus: "complete" as const,
    s3Id: "penelope-diff-transparent.png",
    createdAt: now,
    updatedAt: now,
  };

  const stableArtifactDiff = {
    ...defaultArtifactDiff,
    s3Id: null,
    score: 0,
  };

  const addedArtifactDiff = {
    ...defaultArtifactDiff,
    baseArtifactId: null,
    s3Id: null,
    score: null,
  };

  const updatedArtifactDiff = {
    ...defaultArtifactDiff,
    score: 0.3,
  };

  const removedArtifactDiff = {
    ...defaultArtifactDiff,
    headArtifactId: null,
  };

  const failedArtifactDiff = {
    ...addedArtifactDiff,
    headArtifactId: screenshots[2]!.id,
  };

  const buildArtifactDiffs = {
    [orphanBuild!.id]: duplicate(addedArtifactDiff, 3),
    [referenceBuild!.id]: [
      ...duplicate(addedArtifactDiff, 2),
      ...duplicate(stableArtifactDiff, 3),
    ],
    [diffDetectedBuild!.id]: [
      ...duplicate(stableArtifactDiff, 2),
      ...duplicate(failedArtifactDiff, 2),
      ...duplicate(removedArtifactDiff, 2),
      ...bearArtifactIds.map((id) => ({
        ...addedArtifactDiff,
        headArtifactId: id,
      })),
      {
        ...updatedArtifactDiff,
        s3Id: "diff-1024-to-720.png",
        baseArtifactId: mediumDummyArtifact!.id,
        headArtifactId: smallDummyArtifact!.id,
        fileId: dummiesDiffFiles[0]!.id,
        testId: smallDummyArtifact!.testId,
      },
      {
        ...updatedArtifactDiff,
        s3Id: "diff-1024-to-1440.png",
        baseArtifactId: mediumDummyArtifact!.id,
        headArtifactId: largeDummyArtifact!.id,
        fileId: dummiesDiffFiles[1]!.id,
        testId: largeDummyArtifact!.testId,
      },
      ...duplicate(
        { ...updatedArtifactDiff, group: updatedArtifactDiff.s3Id },
        4,
      ),
    ],
    [acceptedBuild!.id]: [
      { ...addedArtifactDiff },
      ...duplicate({ ...stableArtifactDiff }, 3),
      ...duplicate({ ...updatedArtifactDiff }, 2),
    ],
    [rejectedBuild!.id]: [
      { ...addedArtifactDiff },
      ...duplicate({ ...stableArtifactDiff }, 3),
      ...duplicate({ ...updatedArtifactDiff }, 3),
    ],
    [inProgressBuild!.id]: [
      { ...updatedArtifactDiff, jobStatus: "pending" as const },
    ],
    [failBuild!.id]: [...duplicate(stableArtifactDiff, 3), failedArtifactDiff],
    [stableBuild!.id]: duplicate(stableArtifactDiff, 3),
    [removedBuild!.id]: [
      ...duplicate(stableArtifactDiff, 3),
      ...duplicate(removedArtifactDiff, 2),
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

  const screenshotDiffs = await ArtifactDiff.query()
    .withGraphFetched("compareArtifact.test")
    .insertAndFetch(
      Object.keys(buildArtifactDiffs).flatMap((buildId) =>
        buildArtifactDiffs[buildId]!.map((screenshotDiff) => {
          return {
            ...screenshotDiff,
            buildId,
          };
        }),
      ),
    );

  await Promise.all(
    screenshotDiffs.map(async ({ id, headArtifact }) => {
      if (headArtifact?.test?.id) {
        await ArtifactDiff.query()
          .findById(id)
          .patch({ testId: headArtifact.test.id });
      }
    }),
  );

  const completeBuilds = await Build.query().where("jobStatus", "complete");
  for (const build of completeBuilds) {
    await concludeBuild({ build, notify: false });
  }
}
