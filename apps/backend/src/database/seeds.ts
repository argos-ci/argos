import type { ScreenshotMetadata } from "@argos/schemas/screenshot-metadata";
import { invariant } from "@argos/util/invariant";

import { concludeBuild } from "@/build/concludeBuild";
import { decodeFingerprint } from "@/util/fingerprint";

import { knex } from "./knex";
import { UserEmail } from "./models";
import { Account } from "./models/Account";
import { Build } from "./models/Build";
import { BuildReview } from "./models/BuildReview";
import { Comment } from "./models/Comment";
import { Deployment } from "./models/Deployment";
import { DeploymentAlias } from "./models/DeploymentAlias";
import { File } from "./models/File";
import { Flow } from "./models/Flow";
import {
  FlowRun,
  type FlowRunAnnotation,
  type FlowRunOutcome,
  type FlowRunStatus,
} from "./models/FlowRun";
import { GithubAccount } from "./models/GithubAccount";
import { GithubInstallation } from "./models/GithubInstallation";
import { GithubPullRequest } from "./models/GithubPullRequest";
import { GithubRepository } from "./models/GithubRepository";
import { GithubRepositoryInstallation } from "./models/GithubRepositoryInstallation";
import { Media } from "./models/Media";
import { MediaDiff } from "./models/MediaDiff";
import { MediaVersion } from "./models/MediaVersion";
import { OAuthClient } from "./models/OAuthClient";
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
import { UserPasskey } from "./models/UserPasskey";
import { ignoreChange } from "./services/ignored-change";

function duplicate<T>(obj: T, count: number): T[] {
  return Array.from({ length: count }, () => obj);
}

export async function createUserAccount(input: {
  email: string;
  slug: string;
  name: string;
  githubId?: number;
  staff?: boolean;
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
        staff: input.staff ?? false,
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

/**
 * Register passkeys on a user, so the settings list can be rendered without
 * running a WebAuthn ceremony. The credential material is fake: nothing here
 * signs anything, it only has to satisfy the columns.
 */
export async function createPasskeys(input: {
  userId: string;
  names: string[];
  keyPrefix: string;
}): Promise<UserPasskey[]> {
  return UserPasskey.query().insertAndFetch(
    input.names.map((name, index) => ({
      userId: input.userId,
      credentialId: `${input.keyPrefix}passkey-${index}`,
      publicKey: `${input.keyPrefix}public-key-${index}`,
      counter: "0",
      transports: ["internal" as const, "hybrid" as const],
      backedUp: true,
      aaguid: null,
      name,
      lastUsedAt: new Date("2026-06-15T10:00:00Z").toISOString(),
    })),
  );
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

/**
 * A public OAuth client, as `argos login` registers one. `knownAppId` is what
 * confers the verified badge, the official display name and the bundled logo —
 * the stored `clientName` is only a fallback for unrecognized apps.
 */
export async function createOAuthClient(input: {
  clientId: string;
  redirectUris: string[];
  knownAppId?: string | null;
  clientName?: string;
}): Promise<OAuthClient> {
  const knownAppId = input.knownAppId ?? null;
  return OAuthClient.query().insertAndFetch({
    clientId: input.clientId,
    clientName: input.clientName ?? "Argos CLI",
    redirectUris: input.redirectUris,
    grantTypes: ["authorization_code", "refresh_token"],
    responseTypes: ["code"],
    tokenEndpointAuthMethod: "none",
    isFirstParty: true,
    knownAppId,
    verified: knownAppId !== null,
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
  subsetBuild: Build;
};

/**
 * Creates a full set of build scenarios for a given project.
 * Useful for testing build-related UI components.
 */
export async function createBuildScenario(input: {
  projectId: string;
  userId?: string;
}): Promise<BuildScenario> {
  const { projectId } = input;
  const ts = new Date().toISOString();

  const metadataBase = {
    sdk: { name: "@argos-ci/storybook", version: "5.0.0" },
    automationLibrary: { name: "storybook", version: "8.5.0" },
  };

  const chromiumLightMetadata = {
    ...metadataBase,
    browser: { name: "chromium", version: "126.0" },
    colorScheme: "light" as const,
  };

  const firefoxDarkMetadata = {
    ...metadataBase,
    browser: { name: "firefox", version: "127.0" },
    colorScheme: "dark" as const,
  };

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
      // The compare bucket of the build scenarios contains Storybook
      // screenshots (see metadata below).
      storybookScreenshotCount: 11,
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
      metadata: {
        ...chromiumLightMetadata,
        story: { id: "gallery-portrait--default" },
      },
    },
    {
      screenshotBucket: screenshotBuckets[1]!,
      name: "penelope-argos.jpg",
      s3Id: "penelope-argos.jpg",
      metadata: {
        ...chromiumLightMetadata,
        story: { id: "gallery-portrait--default" },
      },
    },
    {
      screenshotBucket: screenshotBuckets[2]!,
      name: "penelope-argos (failed).jpg",
      s3Id: "penelope-argos.jpg",
      metadata: {
        ...chromiumLightMetadata,
        story: { id: "gallery-portrait--default" },
      },
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
      metadata: screenshot.metadata,
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

  // The keys have to be the fixtures' real keys: the browser resolves them to
  // `files.argos-ci.com/<env>/<key>`, and a key nobody uploaded leaves the diff
  // list waiting on a CDN miss for every thumbnail — which is what Argos'
  // screenshot stabilization gives up on when the CDN is slow to answer.
  const screenshotFiles = await Promise.all([
    ...dummiesFilesDimensions.map(({ width, height }) =>
      ensureFile({
        type: "screenshot",
        width,
        height,
        key: `dummy-${width}x${height}.png`,
        contentType: "image/png",
      }),
    ),
    ...bearFilesDimensions.map(({ width, height }) =>
      ensureFile({
        type: "screenshot",
        width,
        height,
        key: `bear-${width}x${height}.jpg`,
        contentType: "image/jpeg",
      }),
    ),
  ]);

  const dummiesDiffFiles = await Promise.all([
    ensureFile({
      type: "screenshotDiff",
      width: 375,
      height: 1024,
      key: "diff-1024-to-720.png",
      contentType: "image/png",
    }),
    ensureFile({
      type: "screenshotDiff",
      width: 375,
      height: 1440,
      key: "diff-1024-to-1440.png",
      contentType: "image/png",
    }),
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
      metadata: file.key.includes("dummy")
        ? {
            ...chromiumLightMetadata,
            story: { id: "gallery-hero--default" },
            viewport: { width: file.width!, height: file.height! },
          }
        : {
            ...firefoxDarkMetadata,
            story: { id: "gallery-bear--default" },
            viewport: { width: file.width!, height: file.height! },
          },
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
    subsetBuild,
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
    { ...buildBase, number: 15, subset: true }, // Subset, with removals
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
    // Subset build: the removals only reflect tests that were not run, so the
    // review surfaces must ignore them and only account for the change.
    [subsetBuild!.id]: [
      ...duplicate(stableScreenshotDiff, 3),
      ...duplicate(removedScreenshotDiff, 2),
      { ...updatedScreenshotDiff },
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
    subsetBuild,
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
    subsetBuild: subsetBuild!,
  };
}

/**
 * Point a scenario at one of the shared image fixtures already hosted on the CDN
 * (`files.argos-ci.com/<env>/<key>`) so its screenshots actually render.
 *
 * A `files.key` is globally unique and the fixtures are shared, so this has to
 * be insert-or-fetch rather than check-then-insert: the DB is not truncated
 * between a spec's retries, and specs seeding the same fixture run in parallel —
 * a plain `findOne` + `insert` races on `files_key_unique`.
 */
async function ensureFile(props: {
  type: "screenshot" | "screenshotDiff";
  width: number;
  height: number;
  key: string;
  contentType: string;
}): Promise<File> {
  await File.query().insert(props).onConflict("key").ignore();
  const file = await File.query().findOne({ key: props.key });
  invariant(file, `File should exist after being seeded: ${props.key}`);
  return file;
}

/**
 * Seeds a single test that has a detected change within the default metrics
 * period (last 7 days), so the test trends page renders its snapshot diff
 * viewer.
 *
 * A change is surfaced by `Test.changes`, which requires a `reference` build —
 * created within the period — carrying a screenshot diff with a score > 0 and
 * a non-null fingerprint. Kept separate from {@link createBuildScenario} so it
 * can be used in isolation (e.g. the test-view visual test) without perturbing
 * the other scenarios' baselines.
 */
/**
 * Instant the time-anchored scenarios below are seeded at.
 *
 * Deliberately not "now". The app renders relative times ("5 seconds ago"), and
 * Argos hides them for screenshots but keeps the space they take — in a
 * monospace font, so one character more is one character wider. A string that
 * crosses "9 seconds" → "10 seconds", or "59 seconds" → "1 minute", while a
 * test is still clicking around therefore shifts everything after it on the
 * line, and the screenshot diffs over nothing. That is what made
 * `test-view-comment` flaky: the seed was `now`, and the run took long enough
 * to change the string's length.
 *
 * Hours back, the string reads the same from the first assertion to the last,
 * while staying inside the default 7-day metrics window the pages query.
 */
function getSeedInstant(): string {
  return new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
}

export async function createTestChangeScenario(input: {
  projectId: string;
}): Promise<{ test: Test; build: Build }> {
  const { projectId } = input;
  const seededAt = getSeedInstant();

  const bucketProps = {
    name: "default",
    branch: "main",
    projectId,
    complete: true,
    valid: true,
    screenshotCount: 0,
    storybookScreenshotCount: 0,
    createdAt: seededAt,
    updatedAt: seededAt,
  };
  const [baseBucket, compareBucket] =
    await ScreenshotBucket.query().insertAndFetch([
      { ...bucketProps, commit: "029b662f3ae57bae7a215301067262c1e95bbc95" },
      { ...bucketProps, commit: "5a23b6f173d9596a09a73864ab051ea5972e8804" },
    ]);
  invariant(baseBucket && compareBucket);

  const [test] = await Test.query().insertAndFetch([
    { name: "penelope-argos.jpg", buildName: "default", projectId },
  ]);
  invariant(test);

  const [baseFile, compareFile, diffFile] = await Promise.all([
    ensureFile({
      type: "screenshot",
      width: 375,
      height: 1024,
      key: "dummy-375x1024.png",
      contentType: "image/png",
    }),
    ensureFile({
      type: "screenshot",
      width: 375,
      height: 720,
      key: "dummy-375x720.png",
      contentType: "image/png",
    }),
    ensureFile({
      type: "screenshotDiff",
      width: 375,
      height: 1024,
      key: "diff-1024-to-720.png",
      contentType: "image/png",
    }),
  ]);

  const [baseScreenshot, compareScreenshot] =
    await Screenshot.query().insertAndFetch([
      {
        screenshotBucketId: baseBucket.id,
        testId: test.id,
        name: "penelope-argos.jpg",
        s3Id: baseFile.key,
        fileId: baseFile.id,
      },
      {
        screenshotBucketId: compareBucket.id,
        testId: test.id,
        name: "penelope-argos.jpg",
        s3Id: compareFile.key,
        fileId: compareFile.id,
      },
    ]);
  invariant(baseScreenshot && compareScreenshot);

  const [build] = await Build.query().insertAndFetch([
    {
      name: "main",
      number: 1,
      type: "reference" as const,
      jobStatus: "complete" as const,
      baseScreenshotBucketId: baseBucket.id,
      compareScreenshotBucketId: compareBucket.id,
      projectId,
      createdAt: seededAt,
      updatedAt: seededAt,
    },
  ]);
  invariant(build);

  await ScreenshotDiff.query().insert([
    {
      buildId: build.id,
      baseScreenshotId: baseScreenshot.id,
      compareScreenshotId: compareScreenshot.id,
      testId: test.id,
      score: 0.3,
      jobStatus: "complete" as const,
      s3Id: diffFile.key,
      fileId: diffFile.id,
      fingerprint: "penelope-argos-change",
      createdAt: seededAt,
      updatedAt: seededAt,
    },
  ]);

  return { test, build };
}

/**
 * A reference build whose test report covers what the Flows tab exists to show:
 * a journey walked across several tests, a journey walked by one, a test that
 * runs and captures nothing, and a test that never ran.
 *
 * The multi-test journey is the shape real suites take. A long path through a
 * product is not one test — it is split, and what ties the pieces back together
 * is the folder the screenshots share (`screenshots(page, "supplier-invoice")`
 * on the Playwright side, `supplier-invoice/loan-beneficiary` on the way out).
 *
 * Kept separate from {@link createBuildScenario} so it can be used on its own
 * without perturbing the other scenarios' baselines.
 */
export async function createFlowsScenario(input: {
  projectId: string;
}): Promise<{ build: Build }> {
  const { projectId } = input;
  const seededAt = getSeedInstant();
  const buildName = "default";
  const runnerProject = "chromium";

  const lastBuild = await Build.query()
    .where("projectId", projectId)
    .max("number as max")
    .first()
    .castTo<{ max: number | null } | undefined>();
  const buildNumber = (lastBuild?.max ?? 0) + 1;

  type SeedScreen = {
    name: string;
    url: string;
    /** Viewport widths the screen was captured at, as the SDK would. */
    widths?: number[];
  };

  // What `viewports: ["iphone-xr", "macbook-13"]` produces: one file per width,
  // suffixed the way the SDK suffixes them, which is what `getVariantKey` reads
  // back to fold them into one step.
  const VIEWPORTS = [414, 1280];
  type SeedFlow = {
    title: string;
    line: number;
    status: FlowRunStatus;
    outcome?: FlowRunOutcome;
    annotations?: FlowRunAnnotation[];
    screens: SeedScreen[];
  };
  type SeedSpec = {
    file: string;
    /** Folder the screenshots of every test below are written to. */
    journey?: string;
    tests: SeedFlow[];
  };

  const origin = "https://app.defacto.dev";
  const specs: SeedSpec[] = [
    {
      file: "e2e/logged/post-loan.spec.ts",
      journey: "supplier-invoice",
      tests: [
        {
          title: "uploads the supplier invoice",
          line: 24,
          status: "passed",
          screens: [
            { name: "invoice-upload", url: `${origin}/invoices/new/payable` },
            { name: "invoice-form", url: `${origin}/invoices/new/8f2ab130` },
          ],
        },
        {
          title: "sets up the loan",
          line: 71,
          status: "passed",
          screens: [
            { name: "loan-set-up", url: `${origin}/loans/new` },
            {
              name: "loan-beneficiary",
              url: `${origin}/loans/new/beneficiary`,
            },
          ],
        },
        {
          title: "confirms the request",
          line: 118,
          status: "passed",
          outcome: "flaky",
          screens: [
            { name: "loan-options", url: `${origin}/loans/new/options` },
            {
              name: "loan-pre-check",
              url: `${origin}/loans/new/pre-check`,
              // Desktop only: the mobile run skips it, which is the gap the
              // canvas is meant to show rather than close.
              widths: [1280],
            },
          ],
        },
      ],
    },
    {
      file: "e2e/logged/receivable-invoice.spec.ts",
      journey: "receivable-invoice",
      tests: [
        {
          title: "requests a loan on a receivable invoice",
          line: 12,
          status: "passed",
          screens: [
            { name: "invoice-new", url: `${origin}/invoices/new` },
            { name: "invoice-form", url: `${origin}/invoices/new/receivable` },
            { name: "loan-set-up", url: `${origin}/loans/new` },
          ],
        },
        {
          title: "rejects an invoice over the limit",
          line: 44,
          status: "failed",
          outcome: "unexpected",
          screens: [],
        },
      ],
    },
    {
      file: "e2e/auth-guard.spec.ts",
      tests: [
        {
          title: "sends a signed-out visitor to /login",
          line: 51,
          status: "passed",
          screens: [{ name: "login", url: `${origin}/login` }],
        },
        {
          title: "does not bounce a signed-in user via /login",
          line: 32,
          status: "passed",
          screens: [],
        },
      ],
    },
    {
      file: "e2e/settings.spec.ts",
      tests: [
        {
          title: "archives a project",
          line: 118,
          status: "skipped",
          outcome: "skipped",
          annotations: [
            { type: "skip", description: "flaky on CI since 12/03" },
          ],
          screens: [],
        },
      ],
    },
  ];

  const screenshotCount = specs.reduce(
    (total, spec) =>
      total +
      spec.tests.reduce(
        (count, test) =>
          count +
          test.screens.reduce(
            (files, screen) => files + (screen.widths ?? VIEWPORTS).length,
            0,
          ),
        0,
      ),
    0,
  );

  const bucket = await ScreenshotBucket.query().insertAndFetch({
    name: buildName,
    branch: "main",
    projectId,
    commit: "8f1a2b3c4d5e6f708192a3b4c5d6e7f809a1b2c3",
    complete: true,
    valid: true,
    screenshotCount,
    storybookScreenshotCount: 0,
    createdAt: seededAt,
    updatedAt: seededAt,
  });

  const build = await Build.query().insertAndFetch({
    name: buildName,
    number: buildNumber,
    type: "reference" as const,
    jobStatus: "complete" as const,
    compareScreenshotBucketId: bucket.id,
    projectId,
    createdAt: seededAt,
    updatedAt: seededAt,
  });

  const file = await ensureFile({
    type: "screenshot",
    width: 375,
    height: 720,
    key: "dummy-375x720.png",
    contentType: "image/png",
  });

  for (const spec of specs) {
    for (const test of spec.tests) {
      const titlePath = [spec.file, test.title];
      const flow = await Flow.query().insertAndFetch({
        projectId,
        buildName,
        key: titlePath.join(" > "),
        file: spec.file,
        title: test.title,
        titlePath,
        lastSeenAt: seededAt,
        createdAt: seededAt,
        updatedAt: seededAt,
      });

      // The runner's test id is what screenshots carry in `metadata.test.id`,
      // so it is what ties the two together here as well.
      const pwTestId = `seed-${flow.id}`;
      const run = await FlowRun.query().insertAndFetch({
        buildId: build.id,
        flowId: flow.id,
        pwProject: runnerProject,
        pwTestId,
        status: test.status,
        outcome: test.outcome ?? null,
        duration: 1200,
        line: test.line,
        annotations: test.annotations ?? null,
        createdAt: seededAt,
        updatedAt: seededAt,
      });

      await Promise.all(
        test.screens.flatMap((screen, index) =>
          (screen.widths ?? VIEWPORTS).map((width) => {
            const metadata: ScreenshotMetadata = {
              url: screen.url,
              viewport: { width, height: Math.round(width * 1.8) },
              browser: { name: runnerProject, version: "141.0" },
              // One index per call, not per file: the viewport variants are the
              // same step of the journey seen twice, so they share it.
              capture: { index, trigger: "manual" },
              test: { id: pwTestId, title: test.title, titlePath },
              automationLibrary: {
                name: "@playwright/test",
                version: "1.62.1",
              },
              sdk: { name: "@argos-ci/playwright", version: "7.4.6" },
            };
            // The SDK prefixes every name with the runner project, the journey
            // folder sits under it, and the viewport is a suffix — the exact
            // shape the journey key and the variant key are read back from.
            const folder = spec.journey ? `${spec.journey}/` : "";
            return Screenshot.query().insert({
              screenshotBucketId: bucket.id,
              flowRunId: run.id,
              name: `${runnerProject}/${folder}${screen.name} vw-${width}.png`,
              s3Id: file.key,
              fileId: file.id,
              metadata,
              createdAt: seededAt,
              updatedAt: seededAt,
            });
          }),
        ),
      );
    }
  }

  return { build };
}

/**
 * The Argos bot account, created on demand. The production row comes from a
 * migration, but the e2e database is truncated between runs.
 */
async function getSeedArgosBotUserId(): Promise<string> {
  const email = "argos-bot@no-reply.argos-ci.com";
  const existing = await User.query().select("id").findOne({ email });
  if (existing) {
    return existing.id;
  }
  const { user } = await createUserAccount({
    email,
    name: "Argos Bot",
    slug: "argos-bot",
    type: "bot",
  });
  return user.id;
}

/**
 * A test Argos scores as flaky: it changed in more than half of the builds that
 * ran it, and one of those changes kept coming back on several days.
 *
 * Flakiness is derived at read time from the daily stats the diff pipeline fills
 * on reference builds, so the scenario seeds those rows directly. Kept separate
 * from {@link createTestChangeScenario} so the pages that only need *a* change
 * keep their current, non-flaky numbers.
 */
export async function createFlakyTestScenario(input: {
  projectId: string;
}): Promise<{ test: Test; build: Build }> {
  const { projectId } = input;
  const { test, build } = await createTestChangeScenario({ projectId });

  const startOfDay = (daysAgo: number) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - daysAgo);
    return date;
  };

  // 6 changes over 10 builds (low stability), 5 of them the same recurring
  // fingerprint spread over two days (low consistency).
  await knex("test_stats_builds").insert({
    testId: test.id,
    date: startOfDay(0),
    value: 10,
  });
  await knex("test_stats_fingerprints").insert([
    {
      testId: test.id,
      fingerprint: "flaky-recurring",
      date: startOfDay(1),
      value: 3,
    },
    {
      testId: test.id,
      fingerprint: "flaky-recurring",
      date: startOfDay(0),
      value: 2,
    },
    {
      testId: test.id,
      fingerprint: "flaky-one-off",
      date: startOfDay(0),
      value: 1,
    },
  ]);

  return { test, build };
}

/**
 * A change that has been ignored and kept reappearing afterwards, so the ignore
 * ledger has a row with an author, a date and a non-zero occurrence count.
 */
export async function createIgnoredChangeScenario(input: {
  projectId: string;
  userId: string;
  /**
   * Attribute the ignore to the Argos bot, as auto-ignore does, instead of to
   * `userId`.
   * @default false
   */
  auto?: boolean;
}): Promise<{ test: Test; build: Build }> {
  const { projectId, auto = false } = input;
  const { test, build } = await createTestChangeScenario({ projectId });

  // Change ids embed the fingerprint and are parsed back by splitting on `-`,
  // so the scenario needs a realistically shaped (dash-free) fingerprint rather
  // than the readable placeholder `createTestChangeScenario` uses.
  const fingerprint = decodeFingerprint("v14f3a9c2e1b8d7605");
  await ScreenshotDiff.query().where("testId", test.id).patch({ fingerprint });

  const userId = auto ? await getSeedArgosBotUserId() : input.userId;
  await ignoreChange({ projectId, testId: test.id, fingerprint, userId });

  // Occurrences are read from the daily fingerprint stats, which the diff
  // pipeline fills on reference builds — seed them directly here. They must be
  // dated after the ignore, since that is the window the ledger counts.
  await knex("test_stats_fingerprints").insert([
    {
      testId: test.id,
      fingerprint,
      date: new Date(Date.now() + 60_000),
      value: 4,
    },
  ]);

  return { test, build };
}

/**
 * A build where a screenshot was compared against a baseline stored under a
 * different name, because its `baseNames` listed a fallback. Kept separate from
 * {@link createBuildScenario} so it can be used in isolation without perturbing
 * the other scenarios' baselines.
 */
export async function createFallbackBaselineScenario(input: {
  projectId: string;
}): Promise<{ build: Build }> {
  const { projectId } = input;
  const seededAt = getSeedInstant();

  const bucketProps = {
    name: "default",
    branch: "main",
    projectId,
    complete: true,
    valid: true,
    screenshotCount: 1,
    storybookScreenshotCount: 0,
    createdAt: seededAt,
    updatedAt: seededAt,
  };
  const [baseBucket, compareBucket] =
    await ScreenshotBucket.query().insertAndFetch([
      { ...bucketProps, commit: "6dcb09b5b57875f334f61aebed695e2e4193db5e" },
      { ...bucketProps, commit: "ac7d1a6a6b0ea1a2d2b4bd0f4c6b6f5b0e3f8a1c" },
    ]);
  invariant(baseBucket && compareBucket);

  const [baseFile, compareFile, diffFile] = await Promise.all([
    ensureFile({
      type: "screenshot",
      width: 375,
      height: 1024,
      key: "dummy-375x1024.png",
      contentType: "image/png",
    }),
    ensureFile({
      type: "screenshot",
      width: 375,
      height: 720,
      key: "dummy-375x720.png",
      contentType: "image/png",
    }),
    ensureFile({
      type: "screenshotDiff",
      width: 375,
      height: 1024,
      key: "diff-1024-to-720.png",
      contentType: "image/png",
    }),
  ]);

  const [baseTest, compareTest] = await Test.query().insertAndFetch([
    { name: "home.png", buildName: "default", projectId },
    { name: "home-variant-b.png", buildName: "default", projectId },
  ]);
  invariant(baseTest && compareTest);

  const [baseScreenshot, compareScreenshot] =
    await Screenshot.query().insertAndFetch([
      {
        screenshotBucketId: baseBucket.id,
        testId: baseTest.id,
        name: "home.png",
        s3Id: baseFile.key,
        fileId: baseFile.id,
      },
      {
        screenshotBucketId: compareBucket.id,
        testId: compareTest.id,
        name: "home-variant-b.png",
        s3Id: compareFile.key,
        fileId: compareFile.id,
        // "home-variant-b.png" does not exist in the baseline, so the comparison
        // falls back to "home.png".
        baseNames: ["home-variant-b.png", "home.png"],
      },
    ]);
  invariant(baseScreenshot && compareScreenshot);

  const [build] = await Build.query().insertAndFetch([
    {
      name: "default",
      number: 1,
      type: "check" as const,
      jobStatus: "complete" as const,
      baseScreenshotBucketId: baseBucket.id,
      compareScreenshotBucketId: compareBucket.id,
      projectId,
      createdAt: seededAt,
      updatedAt: seededAt,
    },
  ]);
  invariant(build);

  await ScreenshotDiff.query().insert([
    {
      buildId: build.id,
      baseScreenshotId: baseScreenshot.id,
      compareScreenshotId: compareScreenshot.id,
      testId: compareTest.id,
      score: 0.3,
      jobStatus: "complete" as const,
      s3Id: diffFile.key,
      fileId: diffFile.id,
      createdAt: seededAt,
      updatedAt: seededAt,
    },
  ]);

  // Computes the build stats and conclusion the build page relies on.
  await concludeBuild({ build, notify: false });

  return { build };
}

/**
 * Three builds sharing one head commit and branch — the shape a commit gets
 * when it runs several suites, and when a monorepo splits them over several
 * Argos projects. Two live in the given project, told apart by their build
 * name; the third lives in a second project of the same account and reuses the
 * `default` name, which is what a build name alone cannot disambiguate. All
 * three end up with changes waiting, so finishing one leaves the others to
 * review.
 */
export async function createSiblingBuildsScenario(input: {
  projectId: string;
}): Promise<{
  defaultBuild: Build;
  storybookBuild: Build;
  docsBuild: Build;
  docsProject: Project;
}> {
  const { projectId } = input;
  const seededAt = getSeedInstant();
  const branch = "feat/sparkle";
  const baseCommit = "b1a7a4a1e5f0c3d2b9a8e7f6c5d4b3a2f1e0d9c8";
  const headCommit = "c2b8b5b2f6a1d4e3c0b9f8a7d6e5c4b3a2f1e0d9";

  const [baseFile, compareFile, diffFile] = await Promise.all([
    ensureFile({
      type: "screenshot",
      width: 375,
      height: 1024,
      key: "dummy-375x1024.png",
      contentType: "image/png",
    }),
    ensureFile({
      type: "screenshot",
      width: 375,
      height: 720,
      key: "dummy-375x720.png",
      contentType: "image/png",
    }),
    ensureFile({
      type: "screenshotDiff",
      width: 375,
      height: 1024,
      key: "diff-1024-to-720.png",
      contentType: "image/png",
    }),
  ]);

  async function createSiblingBuild(options: {
    name: string;
    number: number;
    projectId?: string;
  }) {
    const { name, number, projectId = input.projectId } = options;
    const bucketProps = {
      name,
      projectId,
      complete: true,
      valid: true,
      screenshotCount: 1,
      storybookScreenshotCount: 0,
      createdAt: seededAt,
      updatedAt: seededAt,
    };
    const [baseBucket, compareBucket] =
      await ScreenshotBucket.query().insertAndFetch([
        { ...bucketProps, branch: "main", commit: baseCommit },
        { ...bucketProps, branch, commit: headCommit },
      ]);
    invariant(baseBucket && compareBucket);

    const test = await Test.query().insertAndFetch({
      name: "home.png",
      buildName: name,
      projectId,
    });

    const [baseScreenshot, compareScreenshot] =
      await Screenshot.query().insertAndFetch([
        {
          screenshotBucketId: baseBucket.id,
          testId: test.id,
          name: "home.png",
          s3Id: baseFile.key,
          fileId: baseFile.id,
        },
        {
          screenshotBucketId: compareBucket.id,
          testId: test.id,
          name: "home.png",
          s3Id: compareFile.key,
          fileId: compareFile.id,
        },
      ]);
    invariant(baseScreenshot && compareScreenshot);

    const build = await Build.query().insertAndFetch({
      name,
      number,
      type: "check" as const,
      jobStatus: "complete" as const,
      baseScreenshotBucketId: baseBucket.id,
      compareScreenshotBucketId: compareBucket.id,
      projectId,
      createdAt: seededAt,
      updatedAt: seededAt,
    });

    await ScreenshotDiff.query().insert({
      buildId: build.id,
      baseScreenshotId: baseScreenshot.id,
      compareScreenshotId: compareScreenshot.id,
      testId: test.id,
      score: 0.3,
      jobStatus: "complete" as const,
      s3Id: diffFile.key,
      fileId: diffFile.id,
      createdAt: seededAt,
      updatedAt: seededAt,
    });

    // Computes the build stats and conclusion the build page relies on.
    await concludeBuild({ build, notify: false });

    return build;
  }

  const project = await Project.query().findById(projectId);
  invariant(project, "Project not found");
  const docsProject = await createProject({
    accountId: project.accountId,
    name: `${project.name}-docs`,
  });

  return {
    defaultBuild: await createSiblingBuild({ name: "default", number: 1 }),
    storybookBuild: await createSiblingBuild({ name: "storybook", number: 2 }),
    // A number of its own: build numbers run per project, so the pair
    // (project, number) is what addresses a build across the commit.
    docsBuild: await createSiblingBuild({
      name: "default",
      number: 7,
      projectId: docsProject.id,
    }),
    docsProject,
  };
}

/**
 * Manifest for the "real world" build scenario below.
 *
 * The referenced assets (screenshots, diffs, Playwright traces and markdown
 * snapshots) have already been generated and uploaded to S3 under the
 * `seeds/big/` prefix, so the seed only inserts the rows pointing at them.
 */
const REALWORLD_PREFIX = "seeds/big";
const REALWORLD_SDK = { name: "@argos-ci/playwright", version: "5.0.4" };
const REALWORLD_AUTOMATION_LIBRARY = { name: "playwright", version: "1.49.1" };

const realWorldBuild = {
  name: "default",
  branch: "feat/analytics-redesign",
  baseBranch: "main",
  baseCommit: "a1c9f4e2d8b7063f5e21c0a9d4f8b6e3c7a20915",
  headCommit: "b7e3d05a9c14f862e0d7a3b1c6f9082d4e5a17c8",
  prNumber: 482,
  ciProvider: "github-actions",
  argosSdk: "@argos-ci/playwright@5.0.4",
  runId: "12041850127",
  runAttempt: 1,
  mode: "ci" as const,
  createdAt: "2026-06-15T09:12:51.000Z",
  metadata: {
    testReport: {
      status: "passed" as const,
      stats: {
        startTime: "2026-06-15T09:12:03.000Z",
        duration: 48213,
      },
    },
  },
};

type RealWorldStatus = "unchanged" | "changed" | "added" | "removed";

type RealWorldScreenshot = {
  /** Screenshot/test name as reported by the SDK (also the S3 key suffix). */
  name: string;
  title: string;
  status: RealWorldStatus;
  /** Source file the test lives in. */
  spec: string;
  /** URL of the page (or file) that was captured. */
  url: string;
  contentType: string;
  /** Image viewport. Absent for text (markdown) snapshots. */
  viewport?: { width: number; height: number };
  browser?: { name: string; version: string };
  /** Diff score for "changed" screenshots (0 < score <= 1). */
  score?: number;
  /** Attach a Playwright trace file (a non-screenshot file). */
  trace?: boolean;
};

const CHROMIUM = { name: "chromium", version: "131.0.6778.85" };
const FIREFOX = { name: "firefox", version: "133.0" };
const WEBKIT = { name: "webkit", version: "18.2" };

const realWorldScreenshots: RealWorldScreenshot[] = [
  {
    name: "auth/login.png",
    title: "renders the sign-in page",
    status: "unchanged",
    spec: "e2e/auth.spec.ts",
    url: "https://app.acme-analytics.dev/login",
    contentType: "image/png",
    viewport: { width: 1280, height: 800 },
    browser: CHROMIUM,
  },
  {
    name: "dashboard/overview.png",
    title: "renders the dashboard overview",
    status: "changed",
    spec: "e2e/dashboard.spec.ts",
    url: "https://app.acme-analytics.dev/dashboard",
    contentType: "image/png",
    viewport: { width: 1280, height: 800 },
    browser: CHROMIUM,
    score: 0.0698,
    trace: true,
  },
  {
    name: "dashboard/overview.mobile.png",
    title: "renders the dashboard overview on mobile",
    status: "changed",
    spec: "e2e/dashboard.spec.ts",
    url: "https://app.acme-analytics.dev/dashboard",
    contentType: "image/png",
    viewport: { width: 390, height: 844 },
    browser: WEBKIT,
    score: 0.0019,
  },
  {
    name: "marketing/pricing.png",
    title: "renders the pricing page",
    status: "changed",
    spec: "e2e/marketing.spec.ts",
    url: "https://acme-analytics.dev/pricing",
    contentType: "image/png",
    viewport: { width: 1280, height: 800 },
    browser: CHROMIUM,
    score: 0.0009,
    trace: true,
  },
  {
    name: "settings/profile.png",
    title: "renders the profile settings",
    status: "unchanged",
    spec: "e2e/settings.spec.ts",
    url: "https://app.acme-analytics.dev/settings/profile",
    contentType: "image/png",
    viewport: { width: 1280, height: 800 },
    browser: FIREFOX,
  },
  {
    name: "team/members.png",
    title: "renders the team members page",
    status: "added",
    spec: "e2e/team.spec.ts",
    url: "https://app.acme-analytics.dev/team",
    contentType: "image/png",
    viewport: { width: 1280, height: 800 },
    browser: CHROMIUM,
  },
  {
    name: "integrations/marketplace.png",
    title: "renders the integrations marketplace",
    status: "removed",
    spec: "e2e/integrations.spec.ts",
    url: "https://app.acme-analytics.dev/integrations",
    contentType: "image/png",
    viewport: { width: 1280, height: 800 },
    browser: CHROMIUM,
  },
  // Markdown text snapshots — compared as text, rendered as a markdown diff.
  {
    name: "docs/README.md",
    title: "matches the README snapshot",
    status: "changed",
    spec: "e2e/docs.spec.ts",
    url: "https://github.com/acme/analytics/blob/main/docs/README.md",
    contentType: "text/markdown",
    // Text snapshots have no pixel score: any change is a full mismatch.
    score: 1,
  },
  {
    name: "reports/test-summary.md",
    title: "matches the test summary snapshot",
    status: "added",
    spec: "e2e/docs.spec.ts",
    url: "https://github.com/acme/analytics/blob/main/reports/test-summary.md",
    contentType: "text/markdown",
  },
];

const getBaseKey = (s: RealWorldScreenshot) =>
  `${REALWORLD_PREFIX}/base/${s.name}`;
const getCompareKey = (s: RealWorldScreenshot) =>
  `${REALWORLD_PREFIX}/compare/${s.name}`;
const getDiffKey = (s: RealWorldScreenshot) =>
  `${REALWORLD_PREFIX}/diff/${s.name}`;
const getTraceKey = (s: RealWorldScreenshot) =>
  `${REALWORLD_PREFIX}/trace/${s.name}.zip`;
const isRealWorldImage = (s: RealWorldScreenshot) =>
  s.contentType.startsWith("image/");

/** Build the SDK metadata stored on a screenshot. */
function getRealWorldMetadata(s: RealWorldScreenshot): ScreenshotMetadata {
  const test = {
    title: s.title,
    titlePath: [s.spec.split("/").pop()!, s.title],
    location: { file: s.spec, line: 12, column: 5 },
    retries: 2,
    retry: 0,
  };
  if (isRealWorldImage(s)) {
    return {
      url: s.url,
      viewport: s.viewport,
      colorScheme: "light",
      mediaType: "screen",
      test,
      browser: s.browser,
      automationLibrary: REALWORLD_AUTOMATION_LIBRARY,
      sdk: REALWORLD_SDK,
    };
  }
  return {
    url: s.url,
    test,
    automationLibrary: REALWORLD_AUTOMATION_LIBRARY,
    sdk: REALWORLD_SDK,
  };
}

/**
 * Creates a realistic CI build with real metadata, polished screenshots and a
 * couple of non-screenshot files (Playwright traces and markdown snapshots). It
 * mimics a pull request that redesigns the analytics dashboard: a few
 * screenshots change, one is added and one is removed.
 */
async function createRealWorldBuildScenario(input: {
  projectId: string;
}): Promise<Build> {
  const { projectId } = input;
  const { createdAt } = realWorldBuild;

  const bucketBase = {
    name: realWorldBuild.name,
    projectId,
    createdAt,
    updatedAt: createdAt,
    complete: true,
    valid: true,
    storybookScreenshotCount: 0,
  };

  const [baseBucket, compareBucket] =
    await ScreenshotBucket.query().insertAndFetch([
      {
        ...bucketBase,
        commit: realWorldBuild.baseCommit,
        branch: realWorldBuild.baseBranch,
        screenshotCount: realWorldScreenshots.filter(
          (s) => s.status !== "added",
        ).length,
      },
      {
        ...bucketBase,
        commit: realWorldBuild.headCommit,
        branch: realWorldBuild.branch,
        screenshotCount: realWorldScreenshots.filter(
          (s) => s.status !== "removed",
        ).length,
      },
    ]);

  invariant(baseBucket && compareBucket, "buckets not created");

  const build = await Build.query().insertAndFetch({
    name: realWorldBuild.name,
    baseScreenshotBucketId: baseBucket.id,
    compareScreenshotBucketId: compareBucket.id,
    projectId,
    jobStatus: "complete",
    type: "check",
    mode: realWorldBuild.mode,
    baseBranch: realWorldBuild.baseBranch,
    baseBranchResolvedFrom: "project",
    prNumber: realWorldBuild.prNumber,
    baseCommit: realWorldBuild.baseCommit,
    prHeadCommit: realWorldBuild.headCommit,
    ciProvider: realWorldBuild.ciProvider,
    argosSdk: realWorldBuild.argosSdk,
    runId: realWorldBuild.runId,
    runAttempt: realWorldBuild.runAttempt,
    partial: false,
    metadata: realWorldBuild.metadata,
    createdAt,
    updatedAt: createdAt,
  });

  const tests = await Test.query().insertAndFetch(
    realWorldScreenshots.map((screenshot) => ({
      name: screenshot.name,
      buildName: realWorldBuild.name,
      projectId,
    })),
  );
  const testIdByName = new Map(tests.map((test) => [test.name, test.id]));

  // Create the underlying File rows for every uploaded asset.
  const fileInputs = realWorldScreenshots.flatMap((screenshot) => {
    const inputs: {
      type: "screenshot" | "screenshotDiff" | "playwrightTrace";
      key: string;
      width: number | null;
      height: number | null;
      contentType: string;
    }[] = [];
    // Markdown text snapshots have no dimensions.
    const width = screenshot.viewport?.width ?? null;
    const height = screenshot.viewport?.height ?? null;
    const contentType = screenshot.contentType;
    if (screenshot.status !== "added") {
      inputs.push({
        type: "screenshot",
        key: getBaseKey(screenshot),
        width,
        height,
        contentType,
      });
    }
    if (screenshot.status !== "removed") {
      inputs.push({
        type: "screenshot",
        key: getCompareKey(screenshot),
        width,
        height,
        contentType,
      });
    }
    // Only image diffs produce a diff file; text diffs are computed by the UI.
    if (screenshot.status === "changed" && isRealWorldImage(screenshot)) {
      inputs.push({
        type: "screenshotDiff",
        key: getDiffKey(screenshot),
        width,
        height,
        contentType: "image/png",
      });
    }
    if (screenshot.trace) {
      inputs.push({
        type: "playwrightTrace",
        key: getTraceKey(screenshot),
        width: null,
        height: null,
        contentType: "application/zip",
      });
    }
    return inputs;
  });
  const files = await File.query().insertAndFetch(fileInputs);
  const fileIdByKey = new Map(files.map((file) => [file.key, file.id]));

  // Base screenshots (everything that is not freshly added).
  const baseScreenshots = await Screenshot.query().insertAndFetch(
    realWorldScreenshots
      .filter((screenshot) => screenshot.status !== "added")
      .map((screenshot) => {
        const key = getBaseKey(screenshot);
        return {
          screenshotBucketId: baseBucket.id,
          name: screenshot.name,
          s3Id: key,
          fileId: fileIdByKey.get(key) ?? null,
          testId: testIdByName.get(screenshot.name) ?? null,
          metadata: getRealWorldMetadata(screenshot),
        };
      }),
  );
  const baseScreenshotIdByName = new Map(
    baseScreenshots.map((screenshot) => [screenshot.name, screenshot.id]),
  );

  // Compare screenshots (everything that is not removed), with traces attached.
  const compareScreenshots = await Screenshot.query().insertAndFetch(
    realWorldScreenshots
      .filter((screenshot) => screenshot.status !== "removed")
      .map((screenshot) => {
        const key = getCompareKey(screenshot);
        return {
          screenshotBucketId: compareBucket.id,
          name: screenshot.name,
          s3Id: key,
          fileId: fileIdByKey.get(key) ?? null,
          testId: testIdByName.get(screenshot.name) ?? null,
          metadata: getRealWorldMetadata(screenshot),
          playwrightTraceFileId: screenshot.trace
            ? (fileIdByKey.get(getTraceKey(screenshot)) ?? null)
            : null,
        };
      }),
  );
  const compareScreenshotIdByName = new Map(
    compareScreenshots.map((screenshot) => [screenshot.name, screenshot.id]),
  );

  await ScreenshotDiff.query().insert(
    realWorldScreenshots.map((screenshot) => {
      // A diff image only exists for "changed" image screenshots; text diffs
      // (markdown) carry a full-mismatch score but no diff file.
      const hasDiffImage =
        screenshot.status === "changed" && isRealWorldImage(screenshot);
      const diffKey = getDiffKey(screenshot);
      const score = (() => {
        switch (screenshot.status) {
          case "changed":
            return screenshot.score ?? 1;
          case "unchanged":
            return 0;
          case "added":
          case "removed":
            return null;
        }
      })();
      return {
        buildId: build.id,
        testId: testIdByName.get(screenshot.name) ?? null,
        baseScreenshotId: baseScreenshotIdByName.get(screenshot.name) ?? null,
        compareScreenshotId:
          compareScreenshotIdByName.get(screenshot.name) ?? null,
        jobStatus: "complete" as const,
        score,
        s3Id: hasDiffImage ? diffKey : null,
        fileId: hasDiffImage ? (fileIdByKey.get(diffKey) ?? null) : null,
        createdAt,
        updatedAt: createdAt,
      };
    }),
  );

  await concludeBuild({ build, notify: false });

  return build;
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
      slug: `${projectName}-${accountSlug}-preview-main`,
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
      slug: `${projectName}-${accountSlug}-production`,
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
      slug: `${projectName}-${accountSlug}-list-item-text-inset-prop-pending`,
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
      slug: `${projectName}-${accountSlug}-list-item-text-inset-prop-error`,
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
      includedScreenshots: 35000,
      githubPlanId: null,
      stripeProductId: "prod_T1xSYCXWLyCxCH",
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
      staff: true,
    }),
    createUserAccount({
      email: "jeremy@smooth-code.com",
      name: "Jeremy Sfez",
      slug: "jsfez",
      githubId: 15954562,
      staff: true,
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
      githubId: 82474570,
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

  await createRealWorldBuildScenario({
    projectId: bigProject.id,
  });

  await createDeploymentScenario({
    projectId: bigProject.id,
    accountSlug: smoothAccount.slug,
    projectName: bigProject.name,
  });

  await createDemoMediaScenario({
    projectId: bigProject.id,
    authorUserId: greg.user.id,
    replierUserId: jeremy.user.id,
  });

  // The Flows tab reads the reference build's test report, which only the
  // Playwright reporter produces — so without a seeded one there is nothing to
  // look at in development. It lands on the project that already carries
  // everything else, and becomes its newest reference build: the tab reads the
  // newest one by definition, so it could not be dated behind the others.
  await createFlowsScenario({ projectId: bigProject.id });
}

/**
 * Standalone media for the team media library and the share page.
 *
 * Reuses the `dummy-*` image keys the screenshot seeds use — the only ones that
 * exist in the test bucket — so the thumbnails and the share page load real images.
 * The recorded dimensions have to match those files, because the share page sizes
 * its frame from them. Fixed timestamps keep the visual baselines stable.
 */
export async function createMediaScenario(input: {
  projectId: string;
  /** When given, seeds a pinned thread and a plain comment on the "after" image. */
  commentAuthorId?: string;
  /**
   * Publish all four media to a pull request, creating the GitHub rows they
   * need — a seeded project is not connected to a repository. What the share
   * page's pull request button and its sidebar both need to have something to
   * show: three entries, since the pair counts once.
   */
  withPullRequest?: boolean;
}) {
  const { projectId, commentAuthorId, withPullRequest } = input;
  const githubPullRequestId = withPullRequest
    ? await createMediaPullRequest(projectId)
    : null;
  const beforeTs = "2026-04-20T08:00:00.000Z";
  const afterV1Ts = "2026-04-20T09:00:00.000Z";
  const afterV2Ts = "2026-04-20T10:00:00.000Z";
  const videoTs = "2026-04-20T09:30:00.000Z";
  const soloTs = "2026-04-20T07:00:00.000Z";

  // A before/after pair sharing one name, which is what lets the share page show
  // them together and compare them, plus a video and a lone screenshot that
  // stand alone — the share page has no counterpart to draw beside those, which
  // is a different layout from the pair's.
  const [before, after, video, solo] = await Media.query().insertAndFetch([
    {
      projectId,
      name: "checkout.png",
      state: "before" as const,
      description: "Checkout before the spacing fix.",
      visibility: "team" as const,
      githubPullRequestId,
      shareToken: `seed-media-before-${projectId}`,
      createdAt: beforeTs,
      updatedAt: beforeTs,
    },
    {
      projectId,
      name: "checkout.png",
      state: "after" as const,
      description: "Checkout after the spacing fix.",
      visibility: "team" as const,
      githubPullRequestId,
      shareToken: `seed-media-after-${projectId}`,
      createdAt: afterV1Ts,
      updatedAt: afterV1Ts,
    },
    {
      projectId,
      name: "checkout-flow.mp4",
      state: null,
      description: null,
      visibility: "public" as const,
      githubPullRequestId,
      shareToken: `seed-media-video-${projectId}`,
      createdAt: videoTs,
      updatedAt: videoTs,
    },
    {
      projectId,
      name: "dashboard.png",
      state: null,
      description: "Overview screen after the sidebar redesign.",
      visibility: "public" as const,
      githubPullRequestId,
      shareToken: `seed-media-solo-${projectId}`,
      createdAt: soloTs,
      updatedAt: soloTs,
    },
  ]);

  invariant(before && after && video && solo, "media should be created");

  // The "after" image has two versions: the reviewer asked for a change and the
  // second upload answered it. That is the state the version UI has to render.
  //
  // Its newest version is deliberately a different file — and a different shape
  // — from the "before": a pair of identical bytes compares to nothing, and the
  // page's whole compare surface would have no changes to mark.
  const [afterV1, afterV2] = await MediaVersion.query().insertAndFetch([
    {
      mediaId: after.id,
      number: 1,
      key: "dummy-375x720.png",
      mimeType: "image/png",
      sizeBytes: "188416",
      width: 375,
      height: 720,
      // Far enough out that the "expiring soon" colour never fires in a baseline.
      expiresAt: "2027-04-20T09:00:00.000Z",
      uploadedAt: afterV1Ts,
      billedUnits: 1,
      createdAt: afterV1Ts,
      updatedAt: afterV1Ts,
    },
    {
      mediaId: after.id,
      number: 2,
      key: "dummy-375x1024.png",
      mimeType: "image/png",
      sizeBytes: "196608",
      width: 375,
      height: 1024,
      expiresAt: "2027-04-20T10:00:00.000Z",
      uploadedAt: afterV2Ts,
      billedUnits: 1,
      createdAt: afterV2Ts,
      updatedAt: afterV2Ts,
    },
  ]);
  invariant(afterV1 && afterV2, "the after media should have two versions");

  const [beforeV1, videoV1, soloV1] = await MediaVersion.query().insertAndFetch(
    [
      {
        mediaId: before.id,
        number: 1,
        key: "dummy-375x720.png",
        mimeType: "image/png",
        sizeBytes: "184320",
        width: 375,
        height: 720,
        expiresAt: "2027-04-20T08:00:00.000Z",
        uploadedAt: beforeTs,
        billedUnits: 1,
        createdAt: beforeTs,
        updatedAt: beforeTs,
      },
      {
        mediaId: video.id,
        number: 1,
        key: "dummy-375x1024.png",
        mimeType: "video/mp4",
        sizeBytes: "8388608",
        expiresAt: "2027-04-20T09:30:00.000Z",
        uploadedAt: videoTs,
        billedUnits: 25,
        createdAt: videoTs,
        updatedAt: videoTs,
      },
      {
        // Landscape, unlike the pair: a lone media fills its pane on the axis
        // its shape gives it, and the pin projection has to follow.
        //
        // Deliberately with no recorded dimensions. Processing reads them from
        // the file's header and tolerates not finding them, so this is a state
        // real uploads reach — and the viewer has to project pins against the
        // image it measured rather than give up on the whole comment layer.
        mediaId: solo.id,
        number: 1,
        key: "bear-1440x1024.jpg",
        mimeType: "image/jpeg",
        sizeBytes: "131072",
        width: null,
        height: null,
        expiresAt: "2027-04-20T07:00:00.000Z",
        uploadedAt: soloTs,
        billedUnits: 1,
        createdAt: soloTs,
        updatedAt: soloTs,
      },
    ],
  );
  invariant(beforeV1 && videoV1 && soloV1, "versions should be created");

  // The pair's comparison, already computed. In the app a worker produces this a
  // few seconds after the second half lands; a Playwright run has no worker and
  // no bucket to write to, so the finished row is seeded with a mask that really
  // is the diff of these two dummies — 375×1024, the union of a 720-tall
  // "before" and a 1024-tall "after".
  await MediaDiff.query().insert([
    {
      beforeMediaVersionId: beforeV1.id,
      afterMediaVersionId: afterV2.id,
      jobStatus: "complete",
      score: 0.3,
      key: "diff-1024-to-720.png",
      width: 375,
      height: 1024,
      createdAt: afterV2Ts,
      updatedAt: afterV2Ts,
    },
    // The first upload's own comparison, kept as history: v1 was compared
    // against the same "before" when it landed, and picking v1 in the version
    // list has to show *that* result rather than the newest one.
    //
    // No mask, because there is nothing to mark: this seed gives v1 the same
    // file as the "before", and two identical uploads compare to a score of 0
    // and no mask — what `computeMediaDiff` short-circuits to when the two keys
    // match. So the reviewer switching to v1 sees the pair without an overlay,
    // and switching back to v2 sees the changed pixels again.
    {
      beforeMediaVersionId: beforeV1.id,
      afterMediaVersionId: afterV1.id,
      jobStatus: "complete",
      score: 0,
      key: null,
      createdAt: afterV1Ts,
      updatedAt: afterV1Ts,
    },
  ]);

  if (commentAuthorId) {
    const commentTs = "2026-04-20T11:00:00.000Z";
    // A pinned root with a reply, plus one comment about the whole image: the
    // three states the share page has to lay out at once. Pinned to version 1,
    // which is the version the reviewer was looking at when they wrote it.
    const [pinned] = await Comment.query().insertAndFetch([
      {
        mediaId: after.id,
        mediaVersionId: afterV2.id,
        userId: commentAuthorId,
        content: commentDoc("The primary button is misaligned here."),
        anchor: { type: "point" as const, x: 0.62, y: 0.34 },
        createdAt: commentTs,
        updatedAt: commentTs,
      },
    ]);
    invariant(pinned, "comment should be created");
    await Comment.query().insert([
      {
        mediaId: after.id,
        mediaVersionId: afterV2.id,
        userId: commentAuthorId,
        threadId: pinned.id,
        content: commentDoc("Agreed — it should align with the input above."),
        createdAt: commentTs,
        updatedAt: commentTs,
      },
      {
        mediaId: after.id,
        mediaVersionId: afterV2.id,
        userId: commentAuthorId,
        // Mentions a commit sha, which the page autolinks to the repository the
        // project is connected to — only seeded with `withPullRequest`, so a
        // scenario without one is also the "nothing to link to" case.
        content: commentDoc(
          "Otherwise this looks good to ship. Pushed to the PR in d15cba5.",
        ),
        createdAt: commentTs,
        updatedAt: commentTs,
      },
    ]);
  }

  return { before, after, video, solo, afterV2 };
}

/**
 * The demo media files living under `media-seed/` in the **development** bucket
 * (uploaded once by hand — see the keys' `dummy-*` neighbours for the same
 * convention on screenshots). Sizes and dimensions are the real files' and the
 * share page sizes its frame from them, so they must not drift.
 */
const DEMO_MEDIA_FILES = {
  dashboard: {
    key: "media-seed/dashboard.png",
    sizeBytes: "46189",
    width: 1440,
    height: 900,
  },
  checkoutBefore: {
    key: "media-seed/checkout-before.png",
    sizeBytes: "27612",
    width: 720,
    height: 1080,
  },
  checkoutAfter: {
    key: "media-seed/checkout-after.png",
    sizeBytes: "27597",
    width: 720,
    height: 1080,
  },
  pricingV1: {
    key: "media-seed/pricing-v1.png",
    sizeBytes: "22514",
    width: 1200,
    height: 800,
  },
  pricingV2: {
    key: "media-seed/pricing-v2.png",
    sizeBytes: "25081",
    width: 1200,
    height: 800,
  },
  pricingV3: {
    key: "media-seed/pricing-v3.png",
    sizeBytes: "31353",
    width: 1200,
    height: 800,
  },
  onboardingVideo: {
    key: "media-seed/onboarding.mp4",
    sizeBytes: "56244",
    width: 1280,
    height: 720,
  },
} satisfies Record<
  string,
  { key: string; sizeBytes: string; width: number; height: number }
>;

/**
 * Share tokens of the demo media, deliberately memorable: the whole point of the
 * scenario is opening `/m/demo-image` by hand to look at the share page.
 */
const DEMO_MEDIA_TOKENS = [
  "demo-image",
  "demo-before",
  "demo-after",
  "demo-versions",
  "demo-video",
] as const;

/**
 * Every share-page state on checkable URLs, in the development database:
 *
 * - `/m/demo-image` — a lone screenshot, one version.
 * - `/m/demo-before` / `/m/demo-after` — a before/after pair (team-only, so the
 *   header chip differs from the public ones), with a pinned thread on the after.
 * - `/m/demo-versions` — three versions, with a thread pinned to **v2**: its pin
 *   only shows after switching the picker off the latest version.
 * - `/m/demo-video` — a real MP4 the player can actually play, poster derived by
 *   the CDN.
 *
 * Unlike {@link createMediaScenario} (whose fixed clock keeps Playwright
 * baselines stable), dates here are relative to the seeding run so "Uploaded 2
 * hours ago" and the expiry countdown read like live data. Existing demo rows
 * are deleted first — the tokens are constants — so the scenario can be re-run
 * against a database that already has them.
 */
async function createDemoMediaScenario(input: {
  projectId: string;
  /** Authors the demo media and comments. */
  authorUserId: string;
  /** Replies in the pinned thread, so two avatars show. */
  replierUserId: string;
}) {
  const { projectId, authorUserId, replierUserId } = input;

  const hoursAgo = (hours: number) =>
    new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  // Far enough out that nothing expires under whoever is checking, near enough
  // that the countdown shows a value worth reading.
  const expiresAt = new Date(
    Date.now() + 90 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Cascades take the versions and comments along.
  await Media.query()
    .delete()
    .whereIn("shareToken", [...DEMO_MEDIA_TOKENS]);

  const [image, before, after, versions, video] =
    await Media.query().insertAndFetch([
      {
        projectId,
        createdByUserId: authorUserId,
        name: "dashboard.png",
        state: null,
        description: "Overview screen after the sidebar redesign.",
        visibility: "public" as const,
        shareToken: "demo-image",
        createdAt: hoursAgo(50),
        updatedAt: hoursAgo(50),
      },
      {
        projectId,
        createdByUserId: authorUserId,
        name: "checkout.png",
        state: "before" as const,
        description: "Checkout before the spacing fix.",
        visibility: "public" as const,
        shareToken: "demo-before",
        createdAt: hoursAgo(26),
        updatedAt: hoursAgo(26),
      },
      {
        projectId,
        createdByUserId: authorUserId,
        name: "checkout.png",
        state: "after" as const,
        description: "Checkout after the spacing fix.",
        visibility: "public" as const,
        shareToken: "demo-after",
        createdAt: hoursAgo(25),
        updatedAt: hoursAgo(25),
      },
      {
        projectId,
        createdByUserId: authorUserId,
        name: "pricing.png",
        state: null,
        description: "Pricing page — iterating on the plan lineup.",
        visibility: "public" as const,
        shareToken: "demo-versions",
        createdAt: hoursAgo(72),
        updatedAt: hoursAgo(72),
      },
      {
        projectId,
        createdByUserId: authorUserId,
        name: "onboarding.mp4",
        state: null,
        description: "The onboarding flow, end to end.",
        // The team-only sample: opening it logged out shows the unavailable
        // page, which is itself a state worth checking.
        visibility: "team" as const,
        shareToken: "demo-video",
        createdAt: hoursAgo(5),
        updatedAt: hoursAgo(5),
      },
    ]);
  invariant(image && before && after && versions && video, "media created");

  const imageVersion = (args: {
    mediaId: string;
    number: number;
    file: { key: string; sizeBytes: string; width: number; height: number };
    at: string;
    mimeType?: string;
  }) => ({
    mediaId: args.mediaId,
    number: args.number,
    createdByUserId: authorUserId,
    key: args.file.key,
    mimeType: args.mimeType ?? "image/png",
    sizeBytes: args.file.sizeBytes,
    width: args.file.width,
    height: args.file.height,
    expiresAt,
    uploadedAt: args.at,
    billedUnits: 1,
    createdAt: args.at,
    updatedAt: args.at,
  });

  const [, , afterVersion, , pricingV2] =
    await MediaVersion.query().insertAndFetch([
      imageVersion({
        mediaId: image.id,
        number: 1,
        file: DEMO_MEDIA_FILES.dashboard,
        at: hoursAgo(50),
      }),
      imageVersion({
        mediaId: before.id,
        number: 1,
        file: DEMO_MEDIA_FILES.checkoutBefore,
        at: hoursAgo(26),
      }),
      imageVersion({
        mediaId: after.id,
        number: 1,
        file: DEMO_MEDIA_FILES.checkoutAfter,
        at: hoursAgo(25),
      }),
      imageVersion({
        mediaId: versions.id,
        number: 1,
        file: DEMO_MEDIA_FILES.pricingV1,
        at: hoursAgo(72),
      }),
      imageVersion({
        mediaId: versions.id,
        number: 2,
        file: DEMO_MEDIA_FILES.pricingV2,
        at: hoursAgo(30),
      }),
      imageVersion({
        mediaId: versions.id,
        number: 3,
        file: DEMO_MEDIA_FILES.pricingV3,
        at: hoursAgo(2),
      }),
      {
        ...imageVersion({
          mediaId: video.id,
          number: 1,
          file: DEMO_MEDIA_FILES.onboardingVideo,
          at: hoursAgo(5),
          mimeType: "video/mp4",
        }),
        billedUnits: 25,
      },
    ]);
  invariant(afterVersion && pricingV2, "versions created");

  // A pinned thread with a reply on the "after" image — the pin sits on the pay
  // button the pair exists to talk about — plus a plain comment on the whole
  // image.
  const pinned = await Comment.query().insertAndFetch({
    mediaId: after.id,
    mediaVersionId: afterVersion.id,
    userId: authorUserId,
    content: commentDoc("The pay button finally lines up with the field grid."),
    anchor: { type: "point" as const, x: 0.5, y: 0.49 },
    createdAt: hoursAgo(24),
    updatedAt: hoursAgo(24),
  });
  await Comment.query().insert([
    {
      mediaId: after.id,
      mediaVersionId: afterVersion.id,
      userId: replierUserId,
      threadId: pinned.id,
      content: commentDoc("Much better than the before — approving."),
      createdAt: hoursAgo(23),
      updatedAt: hoursAgo(23),
    },
    {
      mediaId: after.id,
      mediaVersionId: afterVersion.id,
      userId: authorUserId,
      content: commentDoc(
        "Spacing between the fields breathes a lot better too.",
      ),
      createdAt: hoursAgo(22),
      updatedAt: hoursAgo(22),
    },
    // Pinned to v2 while v3 is the latest: the pin must stay withheld until the
    // picker is switched to the version it was drawn on.
    {
      mediaId: versions.id,
      mediaVersionId: pricingV2.id,
      userId: replierUserId,
      content: commentDoc(
        "Is $120 the final price for Pro? Feels steep next to Starter.",
      ),
      anchor: { type: "point" as const, x: 0.72, y: 0.38 },
      createdAt: hoursAgo(28),
      updatedAt: hoursAgo(28),
    },
  ]);
}

/**
 * The GitHub rows a pull request needs, plus the pull request.
 *
 * A seeded project is not connected to a repository, so this creates one and
 * links it — enough for the share header to render a real number, title and URL.
 */
async function createMediaPullRequest(projectId: string): Promise<string> {
  const project = await Project.query().findById(projectId);
  invariant(project, "project should exist");

  const githubAccount = await GithubAccount.query().insertAndFetch({
    githubId: 90000000 + Number(projectId),
    name: "Acme",
    login: `acme-${projectId}`,
    email: null,
    type: "organization",
  });

  const repository = await GithubRepository.query().insertAndFetch({
    name: "sparkle",
    private: false,
    defaultBranch: "main",
    githubId: 91000000 + Number(projectId),
    githubAccountId: githubAccount.id,
  });

  await project.$query().patch({ githubRepositoryId: repository.id });

  const pullRequest = await GithubPullRequest.query().insertAndFetch({
    githubRepositoryId: repository.id,
    number: 1234,
    title: "Tighten the checkout spacing",
    state: "open",
    merged: false,
    draft: false,
    jobStatus: "complete",
    creatorId: githubAccount.id,
    date: "2026-04-19T09:00:00.000Z",
    createdAt: "2026-04-19T09:00:00.000Z",
    updatedAt: "2026-04-19T09:00:00.000Z",
  });

  return pullRequest.id;
}

/** A one-paragraph TipTap document, the shape the comment editor produces. */
function commentDoc(text: string) {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}
