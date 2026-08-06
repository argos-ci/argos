/**
 * Seeds the Flows POC demo into the test database: a "smooth/shop" project
 * with a reference build (#1) holding the Checkout + Signup funnels, and a
 * check build (#2) where two checkout steps changed.
 *
 *   cd apps/backend && NODE_ENV=test node ../../poc/seed.mjs
 *
 * Prints JSON: { rawToken, buildNumber, diffIds } for the Playwright driver.
 */
import { createSession } from "../apps/backend/dist/auth/session.js";
import { concludeBuild } from "../apps/backend/dist/build/concludeBuild.js";
import { knex } from "../apps/backend/dist/database/knex.js";
import { Build } from "../apps/backend/dist/database/models/Build.js";
import { File } from "../apps/backend/dist/database/models/File.js";
import { Plan } from "../apps/backend/dist/database/models/Plan.js";
import { Screenshot } from "../apps/backend/dist/database/models/Screenshot.js";
import { ScreenshotBucket } from "../apps/backend/dist/database/models/ScreenshotBucket.js";
import { ScreenshotDiff } from "../apps/backend/dist/database/models/ScreenshotDiff.js";
import { TeamUser } from "../apps/backend/dist/database/models/TeamUser.js";
import { Test } from "../apps/backend/dist/database/models/Test.js";
import {
  createProject,
  createTeamAccount,
  createUserAccount,
} from "../apps/backend/dist/database/seeds.js";
import { truncateAll } from "../apps/backend/dist/database/testing/index.js";

const VIEWPORT = { width: 1280, height: 832 };

function metadata(over) {
  return {
    sdk: { name: "@argos-ci/playwright", version: "99.0.0" },
    automationLibrary: { name: "playwright", version: "1.61.0" },
    browser: { name: "chromium", version: "126.0" },
    colorScheme: "light",
    viewport: VIEWPORT,
    ...over,
  };
}

function testMeta(file, title) {
  return {
    id: null,
    title,
    titlePath: [file, title],
    location: { file: `tests/e2e/${file}`, line: 12, column: 5 },
  };
}

const CHECKOUT_TEST = testMeta("checkout.spec.ts", "complete a purchase");
const SIGNUP_TEST = testMeta("signup.spec.ts", "create an account");
const SETTINGS_TEST = testMeta("settings.spec.ts", "update notifications");

/**
 * One entry per screen. `v2Key` differs when the step changed in build #2;
 * `diffKey` is the red mask rendered for changed steps.
 */
const SCREENS = [
  {
    name: "checkout/cart",
    key: "flowpoc-checkout-cart.png",
    url: "https://atelier-shop.example.com/checkout/cart",
    test: CHECKOUT_TEST,
  },
  {
    name: "checkout/shipping",
    key: "flowpoc-checkout-shipping.png",
    url: "https://atelier-shop.example.com/checkout/shipping",
    test: CHECKOUT_TEST,
  },
  {
    name: "checkout/payment",
    key: "flowpoc-checkout-payment.png",
    v2Key: "flowpoc-checkout-payment-v2.png",
    diffKey: "flowpoc-diff-payment.png",
    url: "https://atelier-shop.example.com/checkout/payment",
    test: CHECKOUT_TEST,
  },
  {
    name: "checkout/review",
    key: "flowpoc-checkout-review.png",
    url: "https://atelier-shop.example.com/checkout/review",
    test: CHECKOUT_TEST,
  },
  {
    name: "checkout/confirmation",
    key: "flowpoc-checkout-confirmation.png",
    v2Key: "flowpoc-checkout-confirmation-v2.png",
    diffKey: "flowpoc-diff-confirmation.png",
    url: "https://atelier-shop.example.com/checkout/confirmation",
    test: CHECKOUT_TEST,
  },
  {
    name: "signup/create-account",
    key: "flowpoc-signup-account.png",
    url: "https://atelier-shop.example.com/signup",
    test: SIGNUP_TEST,
  },
  {
    name: "signup/verify-email",
    key: "flowpoc-signup-verify.png",
    url: "https://atelier-shop.example.com/signup/verify",
    test: SIGNUP_TEST,
  },
  {
    name: "signup/welcome",
    key: "flowpoc-signup-welcome.png",
    url: "https://atelier-shop.example.com/welcome",
    test: SIGNUP_TEST,
  },
  {
    name: "settings/notifications",
    key: "flowpoc-settings.png",
    url: "https://atelier-shop.example.com/settings/notifications",
    test: SETTINGS_TEST,
  },
];

await truncateAll(knex);

const plan = await Plan.query().insertAndFetch({
  name: "Pro",
  includedScreenshots: 15000,
  githubPlanId: null,
  stripeProductId: null,
  usageBased: false,
  githubSsoIncluded: true,
  fineGrainedAccessControlIncluded: true,
  samlIncluded: true,
  interval: "month",
});

const { user } = await createUserAccount({
  email: "jeremy@smooth-code.com",
  slug: "jeremy",
  name: "Jeremy",
});
const { team, account: teamAccount } = await createTeamAccount({
  slug: "smooth",
  name: "Smooth",
  forcedPlanId: plan.id,
});
await TeamUser.query().insert({
  teamId: team.id,
  userId: user.id,
  userLevel: "owner",
});
const project = await createProject({
  accountId: teamAccount.id,
  name: "shop",
  defaultBaseBranch: "main",
});

/* Files */
const fileKeys = new Set();
for (const screen of SCREENS) {
  fileKeys.add(screen.key);
  if (screen.v2Key) {
    fileKeys.add(screen.v2Key);
  }
}
const screenshotFiles = await File.query().insertAndFetch(
  [...fileKeys].map((key) => ({
    type: "screenshot",
    width: VIEWPORT.width,
    height: VIEWPORT.height,
    key,
    contentType: "image/png",
  })),
);
const diffFiles = await File.query().insertAndFetch(
  SCREENS.filter((s) => s.diffKey).map((s) => ({
    type: "screenshotDiff",
    width: VIEWPORT.width,
    height: VIEWPORT.height,
    key: s.diffKey,
    contentType: "image/png",
  })),
);
const fileByKey = new Map(
  [...screenshotFiles, ...diffFiles].map((f) => [f.key, f]),
);

/* Buckets */
const bucketBase = {
  name: "default",
  projectId: project.id,
  complete: true,
  valid: true,
  mode: "ci",
  screenshotCount: SCREENS.length,
  storybookScreenshotCount: 0,
};
const [referenceBucket, compareBucket] =
  await ScreenshotBucket.query().insertAndFetch([
    {
      ...bucketBase,
      commit: "a3f8c2d41b09e7f6a5d4c3b2a1908f7e6d5c4b3a",
      branch: "main",
      createdAt: "2026-08-04T09:12:00Z",
      updatedAt: "2026-08-04T09:12:00Z",
    },
    {
      ...bucketBase,
      commit: "b7e6d5c4b3a2f1908f7e6d5c4b3a2f1908f7e6d5",
      branch: "feat/apple-pay",
      createdAt: "2026-08-06T08:47:00Z",
      updatedAt: "2026-08-06T08:47:00Z",
    },
  ]);

/* Tests */
const tests = await Test.query().insertAndFetch(
  SCREENS.map((screen) => ({
    name: screen.name,
    buildName: "default",
    projectId: project.id,
  })),
);
const testByName = new Map(tests.map((t) => [t.name, t]));

/* Screenshots */
function screenshotProps(screen, bucket, key) {
  return {
    screenshotBucketId: bucket.id,
    testId: testByName.get(screen.name).id,
    name: screen.name,
    s3Id: key,
    fileId: fileByKey.get(key).id,
    metadata: metadata({
      url: screen.url,
      test: screen.test,
    }),
  };
}

const referenceScreenshots = await Screenshot.query().insertAndFetch(
  SCREENS.map((screen) => screenshotProps(screen, referenceBucket, screen.key)),
);
const compareScreenshots = await Screenshot.query().insertAndFetch(
  SCREENS.map((screen) =>
    screenshotProps(screen, compareBucket, screen.v2Key ?? screen.key),
  ),
);
const referenceByName = new Map(referenceScreenshots.map((s) => [s.name, s]));
const compareByName = new Map(compareScreenshots.map((s) => [s.name, s]));

/* Builds */
const [referenceBuild, checkBuild] = await Build.query().insertAndFetch([
  {
    name: "default",
    number: 1,
    projectId: project.id,
    baseScreenshotBucketId: null,
    compareScreenshotBucketId: referenceBucket.id,
    jobStatus: "complete",
    type: "reference",
    mode: "ci",
    createdAt: "2026-08-04T09:12:00Z",
    updatedAt: "2026-08-04T09:12:00Z",
  },
  {
    name: "default",
    number: 2,
    projectId: project.id,
    baseScreenshotBucketId: referenceBucket.id,
    compareScreenshotBucketId: compareBucket.id,
    jobStatus: "complete",
    type: "check",
    mode: "ci",
    baseBranch: "main",
    baseBranchResolvedFrom: "project",
    prNumber: 214,
    createdAt: "2026-08-06T08:47:00Z",
    updatedAt: "2026-08-06T08:47:00Z",
  },
]);

/* Diffs — build #1 (orphan-style: everything added) */
await ScreenshotDiff.query().insertAndFetch(
  SCREENS.map((screen) => ({
    buildId: referenceBuild.id,
    baseScreenshotId: null,
    compareScreenshotId: referenceByName.get(screen.name).id,
    testId: testByName.get(screen.name).id,
    score: null,
    s3Id: null,
    jobStatus: "complete",
  })),
);

/* Diffs — build #2 (unchanged everywhere, two changed checkout steps) */
const checkDiffs = await ScreenshotDiff.query().insertAndFetch(
  SCREENS.map((screen) => {
    const base = referenceByName.get(screen.name);
    const compare = compareByName.get(screen.name);
    const changed = Boolean(screen.v2Key);
    return {
      buildId: checkBuild.id,
      baseScreenshotId: base.id,
      compareScreenshotId: compare.id,
      testId: testByName.get(screen.name).id,
      score: changed ? 0.042 : 0,
      s3Id: changed ? screen.diffKey : null,
      fileId: changed ? fileByKey.get(screen.diffKey).id : null,
      jobStatus: "complete",
    };
  }),
);

await concludeBuild({ build: referenceBuild, notify: false });
await concludeBuild({ build: checkBuild, notify: false });

/*
 * Second project, reproducing two real-world situations at once: a project
 * with NO reference build (only check builds — the Flows page must fall back
 * to the latest build) whose screenshots carry Storybook story metadata
 * instead of test metadata (flows must group by story component).
 */
const STORY_SCREENS = [
  { name: "signup-form--default", key: "flowpoc-signup-account.png" },
  { name: "signup-form--verify", key: "flowpoc-signup-verify.png" },
  { name: "signup-form--success", key: "flowpoc-signup-welcome.png" },
  { name: "settings-page--default", key: "flowpoc-settings.png" },
];

const dashboardProject = await createProject({
  accountId: teamAccount.id,
  name: "dashboard",
  defaultBaseBranch: "main",
});
const dashboardBucket = await ScreenshotBucket.query().insertAndFetch({
  ...bucketBase,
  projectId: dashboardProject.id,
  screenshotCount: STORY_SCREENS.length,
  storybookScreenshotCount: STORY_SCREENS.length,
  commit: "c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0",
  branch: "feat/new-nav",
  createdAt: "2026-08-06T10:05:00Z",
  updatedAt: "2026-08-06T10:05:00Z",
});
const dashboardTests = await Test.query().insertAndFetch(
  STORY_SCREENS.map((screen) => ({
    name: screen.name,
    buildName: "default",
    projectId: dashboardProject.id,
  })),
);
const dashboardTestByName = new Map(dashboardTests.map((t) => [t.name, t]));
const dashboardScreenshots = await Screenshot.query().insertAndFetch(
  STORY_SCREENS.map((screen) => ({
    screenshotBucketId: dashboardBucket.id,
    testId: dashboardTestByName.get(screen.name).id,
    name: screen.name,
    s3Id: screen.key,
    fileId: fileByKey.get(screen.key).id,
    metadata: {
      sdk: { name: "@argos-ci/storybook", version: "99.0.0" },
      automationLibrary: { name: "storybook", version: "8.5.0" },
      browser: { name: "chromium", version: "126.0" },
      colorScheme: "light",
      viewport: VIEWPORT,
      story: { id: screen.name },
    },
  })),
);
const dashboardBuild = await Build.query().insertAndFetch({
  name: "default",
  number: 1,
  projectId: dashboardProject.id,
  baseScreenshotBucketId: null,
  compareScreenshotBucketId: dashboardBucket.id,
  jobStatus: "complete",
  type: "check",
  mode: "ci",
  createdAt: "2026-08-06T10:05:00Z",
  updatedAt: "2026-08-06T10:05:00Z",
});
await ScreenshotDiff.query().insertAndFetch(
  dashboardScreenshots.map((screenshot) => ({
    buildId: dashboardBuild.id,
    baseScreenshotId: null,
    compareScreenshotId: screenshot.id,
    testId: screenshot.testId,
    score: null,
    s3Id: null,
    jobStatus: "complete",
  })),
);
await concludeBuild({ build: dashboardBuild, notify: false });

const { rawToken } = await createSession({ userId: user.id });

const diffIds = Object.fromEntries(
  checkDiffs.map((diff, index) => [SCREENS[index].name, diff.id]),
);

console.log(
  JSON.stringify(
    {
      rawToken,
      accountSlug: "smooth",
      projectName: "shop",
      referenceBuildNumber: 1,
      checkBuildNumber: 2,
      diffIds,
    },
    null,
    2,
  ),
);

await knex.destroy();
process.exit(0);
