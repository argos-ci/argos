const now = new Date().toISOString();
const timeStamps = { createdAt: now, updatedAt: now };

function duplicate(obj, count) {
  return Array.from({ length: count }, () => obj);
}

export const seed = async (knex) => {
  const [smoothTeam, helloTeam] = await knex("teams")
    .returning("id")
    .insert([timeStamps, timeStamps]);

  const [gregUser, jeremyUser] = await knex("users")
    .returning("id")
    .insert([
      {
        ...timeStamps,
        email: "greg@smooth-code.com",
      },
      {
        ...timeStamps,
        email: "jeremy@smooth-code.com",
      },
    ]);

  const [gregGhAccount, jeremyGhAccount] = await knex("github_accounts")
    .returning("id")
    .insert([
      {
        ...timeStamps,
        githubId: 266302,
        name: "Greg Bergé",
        login: "gregberge",
        email: "greg@smooth-code.com",
        type: "user",
      },
      {
        ...timeStamps,
        githubId: 15954562,
        name: "Jeremy SFEZ",
        login: "jsfez",
        email: "jeremy@smooth-code.com",
        type: "user",
      },
    ]);

  const [smoothAccount, helloAccount] = await knex("accounts")
    .returning("id")
    .insert([
      {
        ...timeStamps,
        teamId: smoothTeam.id,
        name: "Smooth",
        slug: "smooth",
      },
      {
        ...timeStamps,
        teamId: helloTeam.id,
        name: "Hello You",
        slug: "hello-you",
      },
    ]);

  const [gregAccount, jeremyAccount] = await knex("accounts")
    .returning("id")
    .insert([
      {
        ...timeStamps,
        userId: gregUser.id,
        name: "Greg Bergé",
        slug: "gregberge",
        githubAccountId: gregGhAccount.id,
      },
      {
        ...timeStamps,
        userId: jeremyUser.id,
        name: "Jeremy Sfez",
        slug: "jsfez",
        githubAccountId: jeremyGhAccount.id,
      },
    ]);

  await knex("team_users").insert([
    {
      ...timeStamps,
      teamId: smoothTeam.id,
      userId: gregUser.id,
      userLevel: "owner",
    },
    {
      ...timeStamps,
      teamId: smoothTeam.id,
      userId: jeremyUser.id,
      userLevel: "owner",
    },
    {
      ...timeStamps,
      teamId: helloTeam.id,
      userId: gregUser.id,
      userLevel: "owner",
    },
    {
      ...timeStamps,
      teamId: helloTeam.id,
      userId: jeremyUser.id,
      userLevel: "owner",
    },
  ]);

  const projects = await knex("projects")
    .returning("id")
    .insert([
      {
        ...timeStamps,
        name: "big",
        token: "big-xxx",
        accountId: smoothAccount.id,
        private: false,
      },
      {
        ...timeStamps,
        name: "awesome",
        token: "awesome-xxx",
        accountId: helloAccount.id,
        baselineBranch: "main",
      },
      {
        ...timeStamps,
        name: "zone-51",
        token: "zone-51-xxx",
        accountId: gregAccount.id,
      },
      {
        ...timeStamps,
        name: "lalouland",
        token: "lalouland-xxx",
        accountId: jeremyAccount.id,
      },
    ]);

  const screenshotBucket = {
    name: "default",
    commit: "029b662f3ae57bae7a215301067262c1e95bbc95",
    branch: "main",
    projectId: projects[0].id,
    createdAt: "2016-12-08T22:59:55Z",
    updatedAt: "2016-12-08T22:59:55Z",
  };

  const screenshotBuckets = await knex("screenshot_buckets")
    .returning("id")
    .insert([
      screenshotBucket,
      {
        ...screenshotBucket,
        commit: "5a23b6f173d9596a09a73864ab051ea5972e8804",
      },
      {
        ...screenshotBucket,
        commit: "2f73c43533f7d36743c0bee5d0b10f746be3f92c",
        branch: "list-item-text-inset-prop",
      },
      {
        ...screenshotBucket,
        commit: "1ffac615b85e8a63424252768d21b62381f1b44e",
        branch: "list-item-text-inset-prop",
      },
      {
        ...screenshotBucket,
        commit: "852cffe72a964f3783631a0ddc0b51484831363f",
        branch: "list-item-text-inset-prop",
      },
      {
        ...screenshotBucket,
        commit: "8fcaca081dcf18815b474d68b3c4952f4adc83cb",
        branch: "list-item-text-inset-prop",
      },
    ]);

  const screenshots = await knex("screenshots")
    .returning("id")
    .insert([
      {
        ...timeStamps,
        screenshotBucketId: screenshotBuckets[0].id,
        name: "penelope.png",
        s3Id: "penelope.png",
      },
      {
        ...timeStamps,
        screenshotBucketId: screenshotBuckets[1].id,
        name: "penelope-argos.png",
        s3Id: "penelope-argos.png",
      },
      {
        ...timeStamps,
        screenshotBucketId: screenshotBuckets[2].id,
        name: "penelope-argos (failed).png",
        s3Id: "penelope-argos.png",
      },
    ]);

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

  const screenshotFiles = await knex("files")
    .returning("*")
    .insert([
      ...dummiesFilesDimensions.map(({ width, height }) => ({
        ...timeStamps,
        width,
        height,
        key: `dummy-${width}x${height}.png`,
      })),
      ...bearFilesDimensions.map(({ width, height }) => ({
        ...timeStamps,
        width,
        height,
        key: `bear-${width}x${height}.jpg`,
      })),
    ]);

  const dummiesDiffFileIds = await knex("files")
    .returning("id")
    .insert([
      { ...timeStamps, width: 375, height: 1024, key: "diff-1024-to-720.png" },
      { ...timeStamps, width: 375, height: 1440, key: "diff-1024-to-1440.png" },
    ]);

  const [
    { id: smallDummyScreenshotId },
    { id: mediumDummyScreenshotId },
    { id: largeDummyScreenshotId },
    ...bearScreenshots
  ] = await knex("screenshots")
    .returning("id")
    .insert(
      screenshotFiles.map((file) => ({
        ...timeStamps,
        screenshotBucketId: screenshotBuckets[1].id,
        name: file.key,
        s3Id: file.key,
        fileId: file.id,
      }))
    );

  const bearScreenshotIds = bearScreenshots.map(({ id }) => id);

  const build = {
    number: 1,
    name: "main",
    baseScreenshotBucketId: screenshotBuckets[0].id,
    compareScreenshotBucketId: screenshotBuckets[1].id,
    projectId: projects[0].id,
    jobStatus: "complete",
    type: "check",
    createdAt: "2016-12-08T22:59:55Z",
    updatedAt: "2016-12-08T22:59:55Z",
  };

  const [
    { id: orphanBuildId },
    { id: referenceBuildId },
    ,
    ,
    ,
    { id: diffDetectedBuildId },
    { id: acceptedBuildId },
    { id: rejectedBuildId },
    ,
    { id: inProgressBuildId },
    { id: failBuildId },
    { id: stableBuildId },
    ,
    { id: removedBuildId },
  ] = await knex("builds")
    .returning("id")
    .insert([
      { ...build, number: 1, type: "orphan", baseScreenshotBucketId: null },
      { ...build, number: 2, type: "reference" },
      { ...build, number: 3, jobStatus: "progress" }, // Expired
      { ...build, number: 4, jobStatus: "aborted" },
      { ...build, number: 5, jobStatus: "error" },
      { ...build, number: 6 }, // Diff detected
      { ...build, number: 7 }, // Accepted
      { ...build, number: 8 }, // Rejected
      { ...build, ...timeStamps, number: 9, jobStatus: "pending" }, // Pending
      { ...build, ...timeStamps, number: 10 }, // Progress
      { ...build, ...timeStamps, number: 11 }, // Fail
      { ...build, ...timeStamps, number: 12 }, // Stable
      { ...build, ...timeStamps, number: 13 }, // Empty
      { ...build, ...timeStamps, number: 14 }, // Removed
    ]);

  const defaultScreenshotDiff = {
    baseScreenshotId: screenshots[0].id,
    compareScreenshotId: screenshots[1].id,
    score: null,
    jobStatus: "complete",
    validationStatus: "unknown",
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
    compareScreenshotId: screenshots[2].id,
  };

  const buildScreenshotDiffs = {
    [orphanBuildId]: duplicate(addedScreenshotDiff, 3),
    [referenceBuildId]: [
      ...duplicate(addedScreenshotDiff, 2),
      ...duplicate(stableScreenshotDiff, 3),
    ],
    [diffDetectedBuildId]: [
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
        baseScreenshotId: mediumDummyScreenshotId,
        compareScreenshotId: smallDummyScreenshotId,
        fileId: dummiesDiffFileIds[0].id,
      },
      {
        ...updatedScreenshotDiff,
        s3Id: "diff-1024-to-1440.png",
        baseScreenshotId: mediumDummyScreenshotId,
        compareScreenshotId: largeDummyScreenshotId,
        fileId: dummiesDiffFileIds[1].id,
      },
      ...duplicate(updatedScreenshotDiff, 30),
    ],
    [acceptedBuildId]: [
      { ...addedScreenshotDiff, validationStatus: "accepted" },
      ...duplicate(
        { ...stableScreenshotDiff, validationStatus: "accepted" },
        3
      ),
      ...duplicate(
        { ...updatedScreenshotDiff, validationStatus: "accepted" },
        2
      ),
    ],
    [rejectedBuildId]: [
      { ...addedScreenshotDiff, validationStatus: "rejected" },
      ...duplicate(
        { ...stableScreenshotDiff, validationStatus: "rejected" },
        3
      ),
      ...duplicate(
        { ...updatedScreenshotDiff, validationStatus: "rejected" },
        3
      ),
    ],
    [inProgressBuildId]: [{ ...updatedScreenshotDiff, jobStatus: "pending" }],
    [failBuildId]: [
      ...duplicate(stableScreenshotDiff, 3),
      failedScreenshotDiff,
    ],
    [stableBuildId]: duplicate(stableScreenshotDiff, 3),
    [removedBuildId]: [
      ...duplicate(stableScreenshotDiff, 3),
      ...duplicate(removedScreenshotDiff, 2),
    ],
  };

  await knex("screenshot_diffs").insert(
    Object.keys(buildScreenshotDiffs).flatMap((buildId) =>
      buildScreenshotDiffs[buildId].map((screenshotDiff) => ({
        ...screenshotDiff,
        buildId,
      }))
    )
  );

  await knex("plans").insert([
    {
      ...timeStamps,
      name: "free",
      screenshotsLimitPerMonth: 7000,
      githubId: 7772,
    },
    {
      ...timeStamps,
      name: "starter",
      screenshotsLimitPerMonth: 40000,
      githubId: 7786,
      stripePlanId: "prod_MzEZEfBDYFIc53",
    },
    {
      ...timeStamps,
      name: "standard",
      screenshotsLimitPerMonth: 250000,
      githubId: 7787,
      stripePlanId: "prod_MzEavomA8VeCvW",
    },
    {
      ...timeStamps,
      name: "Pro",
      screenshotsLimitPerMonth: 1000000,
      githubId: 7788,
      stripePlanId: "prod_MzEawyq1kFcHEn",
    },
  ]);
};
