exports.seed = async (knex) => {
  await knex("organizations").insert([
    {
      githubId: 1262264,
      name: "Call-Em-All",
      login: "callemall",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      githubId: 5823649,
      name: "Doctolib",
      login: "doctolib",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);
  const organizations = await knex("organizations");

  await knex("users").insert([
    {
      githubId: 3165635,
      name: "Olivier Tassinari",
      login: "oliviertassinari",
      email: "olivier.tassinari@gmail.com",
      scopes: JSON.stringify(["SUPER_ADMIN"]),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      githubId: 266302,
      name: "Greg Bergé",
      login: "neoziro",
      email: "berge.greg@gmail.com",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      githubId: 15954562,
      name: "Jeremy SFEZ",
      login: "jsfez",
      email: "berge.greg@gmail.com",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      accessToken: "jsfez-access-token",
    },
  ]);
  const users = await knex("users");

  await knex("repositories").insert([
    {
      githubId: 23083156,
      name: "material-ui",
      enabled: true,
      token: "650ded7d72e85b52e099df6e56aa204d4fe92fd1",
      organizationId: organizations[0].id,
      baselineBranch: "next",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      githubId: 31123797,
      name: "SplitMe",
      enabled: true,
      token: "650ded7d72e85b52e099df6e56aa204d4fe92fd2",
      userId: users[0].id,
      baselineBranch: "master",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      githubId: 14022421,
      name: "doctolib",
      enabled: true,
      token: "650ded7d72e85b52e099df6e56aa204d4fe92fd3",
      organizationId: organizations[1].id,
      private: true,
      baselineBranch: "master",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);
  const repositories = await knex("repositories");

  await knex("user_repository_rights").insert([
    {
      userId: users[2].id,
      repositoryId: repositories[0].id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  await knex("user_organization_rights").insert([
    {
      userId: users[2].id,
      organizationId: organizations[0].id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  await knex("installations").insert([
    {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      githubId: 7625677,
      deleted: false,
    },
  ]);
  const installations = await knex("installations");

  await knex("user_installation_rights").insert([
    {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: users[2].id,
      installationId: installations[0].id,
    },
  ]);

  await knex("screenshot_buckets").insert([
    {
      name: "default",
      commit: "029b662f3ae57bae7a215301067262c1e95bbc95",
      branch: "master",
      repositoryId: repositories[0].id,
      createdAt: "2016-12-08T22:59:55Z",
      updatedAt: "2016-12-08T22:59:55Z",
    },
    {
      name: "default",
      commit: "5a23b6f173d9596a09a73864ab051ea5972e8804",
      branch: "master",
      repositoryId: repositories[0].id,
      createdAt: "2016-12-12T17:44:29Z",
      updatedAt: "2016-12-12T17:44:29Z",
    },
    {
      name: "default",
      commit: "2f73c43533f7d36743c0bee5d0b10f746be3f92c",
      branch: "list-item-text-inset-prop",
      repositoryId: repositories[0].id,
      createdAt: "2017-02-02T19:55:09Z",
      updatedAt: "2017-02-02T19:55:09Z",
    },
    {
      name: "default",
      commit: "1ffac615b85e8a63424252768d21b62381f1b44e",
      branch: "list-item-text-inset-prop",
      repositoryId: repositories[0].id,
      createdAt: "2017-02-05T23:46:59Z",
      updatedAt: "2017-02-05T23:46:59Z",
    },
    {
      name: "default",
      commit: "852cffe72a964f3783631a0ddc0b51484831363f",
      branch: "list-item-text-inset-prop",
      repositoryId: repositories[0].id,
      createdAt: "2017-02-06T01:27:34Z",
      updatedAt: "2017-02-06T01:27:34Z",
    },
    {
      name: "default",
      commit: "8fcaca081dcf18815b474d68b3c4952f4adc83cb",
      branch: "list-item-text-inset-prop",
      repositoryId: repositories[0].id,
      createdAt: "2017-02-06T01:41:35Z",
      updatedAt: "2017-02-06T01:41:35Z",
    },
  ]);
  const screenshotBuckets = await knex("screenshot_buckets");

  await knex("screenshots").insert([
    {
      screenshotBucketId: screenshotBuckets[0].id,
      name: "ListItem_IconListItem.png",
      s3Id: "1.png",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      screenshotBucketId: screenshotBuckets[1].id,
      name: "ListItem_IconListItem.png",
      s3Id: "2.png",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      screenshotBucketId: screenshotBuckets[2].id,
      name: "ListItem_IconListItem.png",
      s3Id: "3.png",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      screenshotBucketId: screenshotBuckets[3].id,
      name: "ListItem_IconListItem.png",
      s3Id: "4.png",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      screenshotBucketId: screenshotBuckets[4].id,
      name: "ListItem_IconListItem.png",
      s3Id: "5.png",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      screenshotBucketId: screenshotBuckets[5].id,
      name: "ListItem_IconListItem.png",
      s3Id: "6.png",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      screenshotBucketId: screenshotBuckets[5].id,
      name: "ListItem_PrimaryActionCheckboxListItem.png",
      s3Id: "05a852863ea417e63f0d8455c16f2add",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      screenshotBucketId: screenshotBuckets[5].id,
      name: "ListItem_PrimaryActionCheckboxListItem.png",
      s3Id: "e533d40fea973a0e9a4d191073128118",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      screenshotBucketId: screenshotBuckets[5].id,
      name: "ListItem_AvatarListItem.png",
      s3Id: "9.png",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);
  const screenshots = await knex("screenshots");

  await knex("builds").insert([
    {
      number: 1,
      baseScreenshotBucketId: screenshotBuckets[0].id,
      compareScreenshotBucketId: screenshotBuckets[0].id,
      repositoryId: repositories[0].id,
      jobStatus: "complete",
      createdAt: "2016-12-08T22:59:55Z",
      updatedAt: "2016-12-08T22:59:55Z",
    },
    {
      number: 2,
      baseScreenshotBucketId: screenshotBuckets[0].id,
      compareScreenshotBucketId: screenshotBuckets[1].id,
      repositoryId: repositories[0].id,
      jobStatus: "complete",
      createdAt: "2016-12-12T17:44:29Z",
      updatedAt: "2016-12-12T17:44:29Z",
    },
    {
      number: 3,
      baseScreenshotBucketId: screenshotBuckets[1].id,
      compareScreenshotBucketId: screenshotBuckets[2].id,
      repositoryId: repositories[0].id,
      jobStatus: "complete",
      createdAt: "2017-02-02T19:55:09Z",
      updatedAt: "2017-02-02T19:55:09Z",
    },
    {
      number: 4,
      baseScreenshotBucketId: screenshotBuckets[2].id,
      compareScreenshotBucketId: screenshotBuckets[3].id,
      repositoryId: repositories[0].id,
      jobStatus: "complete",
      createdAt: "2017-02-05T23:46:59Z",
      updatedAt: "2017-02-05T23:46:59Z",
    },
    {
      number: 5,
      baseScreenshotBucketId: screenshotBuckets[3].id,
      compareScreenshotBucketId: screenshotBuckets[4].id,
      repositoryId: repositories[0].id,
      jobStatus: "complete",
      createdAt: "2017-02-06T01:27:34Z",
      updatedAt: "2017-02-06T01:27:34Z",
    },
    {
      number: 6,
      baseScreenshotBucketId: screenshotBuckets[4].id,
      compareScreenshotBucketId: screenshotBuckets[5].id,
      repositoryId: repositories[0].id,
      jobStatus: "complete",
      createdAt: "2017-02-06T01:41:35Z",
      updatedAt: "2017-02-06T01:41:35Z",
    },
  ]);
  const builds = await knex("builds");

  await knex("screenshot_diffs").insert([
    {
      buildId: builds[0].id,
      baseScreenshotId: screenshots[0].id,
      compareScreenshotId: screenshots[0].id,
      score: 0,
      jobStatus: "complete",
      validationStatus: "unknown",
      s3Id: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      buildId: builds[1].id,
      baseScreenshotId: screenshots[0].id,
      compareScreenshotId: screenshots[1].id,
      score: 0,
      jobStatus: "complete",
      validationStatus: "unknown",
      s3Id: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      buildId: builds[2].id,
      baseScreenshotId: screenshots[1].id,
      compareScreenshotId: screenshots[2].id,
      score: 0,
      jobStatus: "complete",
      validationStatus: "unknown",
      s3Id: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      buildId: builds[3].id,
      baseScreenshotId: screenshots[2].id,
      compareScreenshotId: screenshots[3].id,
      score: null,
      jobStatus: "pending",
      validationStatus: "unknown",
      s3Id: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      buildId: builds[4].id,
      baseScreenshotId: screenshots[3].id,
      compareScreenshotId: screenshots[4].id,
      score: null,
      jobStatus: "progress",
      validationStatus: "unknown",
      s3Id: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      buildId: builds[5].id,
      baseScreenshotId: screenshots[4].id,
      compareScreenshotId: screenshots[5].id,
      score: 0,
      jobStatus: "complete",
      validationStatus: "unknown",
      s3Id: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      buildId: builds[5].id,
      baseScreenshotId: screenshots[6].id,
      compareScreenshotId: screenshots[7].id,
      score: 0.3,
      jobStatus: "complete",
      validationStatus: "unknown",
      s3Id: "2beb2f76-6e25-45be-8d4d-45813583002c",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      buildId: builds[5].id,
      baseScreenshotId: screenshots[8].id,
      compareScreenshotId: screenshots[8].id,
      score: 0,
      jobStatus: "complete",
      validationStatus: "unknown",
      s3Id: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  await knex("plans").insert([
    {
      name: "free plan",
      screenshotsLimitPerMonth: 7000,
      githubId: 7772,
      createdAt: "2016-12-08T22:59:55Z",
      updatedAt: "2016-12-08T22:59:55Z",
    },
    {
      name: "standard plan",
      screenshotsLimitPerMonth: 100000,
      githubId: 7787,
      createdAt: "2016-12-08T22:59:55Z",
      updatedAt: "2016-12-08T22:59:55Z",
    },
  ]);
};
