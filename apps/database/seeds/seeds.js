const now = new Date().toISOString();
const timeStamps = { createdAt: now, updatedAt: now };

function duplicate(obj, count) {
  return Array.from({ length: count }, () => obj);
}

exports.seed = async (knex) => {
  const organizations = await knex("organizations")
    .returning("id")
    .insert([
      {
        ...timeStamps,
        githubId: 1262264,
        name: "Call-Em-All",
        login: "callemall",
      },
      {
        ...timeStamps,
        githubId: 5823649,
        name: "Doctolib",
        login: "doctolib",
      },
    ]);

  const users = await knex("users")
    .returning("id")
    .insert([
      {
        ...timeStamps,
        githubId: 3165635,
        name: "Olivier Tassinari",
        login: "oliviertassinari",
        email: "olivier.tassinari@gmail.com",
        scopes: JSON.stringify(["SUPER_ADMIN"]),
      },
      {
        ...timeStamps,
        githubId: 266302,
        name: "Greg Bergé",
        login: "neoziro",
        email: "berge.greg@gmail.com",
      },
    ]);

  const repositories = await knex("repositories")
    .returning("id")
    .insert([
      {
        ...timeStamps,
        githubId: 23083156,
        name: "material-ui",
        token: "650ded7d72e85b52e099df6e56aa204d4fe92fd1",
        organizationId: organizations[0],
        baselineBranch: "next",
        defaultBranch: "master",
      },
      {
        ...timeStamps,
        githubId: 31123797,
        name: "SplitMe",
        token: "650ded7d72e85b52e099df6e56aa204d4fe92fd2",
        userId: users[0],
        baselineBranch: "master",
        defaultBranch: null,
      },
      {
        ...timeStamps,
        githubId: 14022421,
        name: "doctolib",
        token: "650ded7d72e85b52e099df6e56aa204d4fe92fd3",
        organizationId: organizations[1],
        private: true,
        baselineBranch: null,
        defaultBranch: "master",
      },
    ]);

  await knex("accounts").insert([
    { ...timeStamps, organizationId: organizations[0], userId: null },
    { ...timeStamps, organizationId: organizations[1], userId: null },
    { ...timeStamps, organizationId: null, userId: users[0] },
  ]);

  const screenshotBucket = {
    name: "default",
    commit: "029b662f3ae57bae7a215301067262c1e95bbc95",
    branch: "master",
    repositoryId: repositories[0],
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
        screenshotBucketId: screenshotBuckets[0],
        name: "penelope.jpg",
        s3Id: "penelope.jpg",
      },
      {
        ...timeStamps,
        screenshotBucketId: screenshotBuckets[1],
        name: "penelope-argos.png",
        s3Id: "penelope-argos.jpg",
      },
      {
        ...timeStamps,
        screenshotBucketId: screenshotBuckets[2],
        name: "penelope-argos (failed).png",
        s3Id: "penelope-argos.jpg",
      },
    ]);

  const build = {
    number: 1,
    name: "main",
    baseScreenshotBucketId: screenshotBuckets[0],
    compareScreenshotBucketId: screenshotBuckets[1],
    repositoryId: repositories[0],
    jobStatus: "complete",
    type: "check",
    createdAt: "2016-12-08T22:59:55Z",
    updatedAt: "2016-12-08T22:59:55Z",
  };

  const [
    orphanBuildId,
    referenceBuildId,
    ,
    ,
    ,
    diffDetectedBuildId,
    acceptedBuildId,
    rejectedBuildId,
    ,
    inProgressBuildId,
    failBuildId,
    stableBuildId,
    ,
    removedBuildId,
  ] = await knex("builds")
    .returning("id")
    .insert([
      { ...build, number: 1, type: "orphan" },
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
    baseScreenshotId: screenshots[0],
    compareScreenshotId: screenshots[1],
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

  const buildScreenshotDiffs = {
    [orphanBuildId]: duplicate(addedScreenshotDiff, 3),
    [referenceBuildId]: [
      ...duplicate(addedScreenshotDiff, 2),
      ...duplicate(stableScreenshotDiff, 3),
    ],
    [diffDetectedBuildId]: [
      ...duplicate(stableScreenshotDiff, 3),
      ...duplicate(updatedScreenshotDiff, 2),
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
      { ...addedScreenshotDiff, compareScreenshotId: screenshots[2] },
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
      name: "standard",
      screenshotsLimitPerMonth: 100000,
      githubId: 7787,
    },
  ]);
};
