import { invariant } from "@argos/util/invariant";
import Knex from "knex";
import ora from "ora";

import config, { createConfig } from "@/config";
import { getKnexConfig, loadDatabaseConfigFromURL } from "@/config/database";
import {
  Build,
  File,
  Model,
  Project,
  Screenshot,
  ScreenshotBucket,
  ScreenshotDiff,
  Test,
} from "@/database/models";
import { getS3Client, uploadFromBuffer } from "@/storage";
import { chunk } from "@/util/chunk";

const fromDatabaseURL = process.env["ARGOS_PRODUCTION_DATABASE_URL"];

invariant(fromDatabaseURL, "ARGOS_PRODUCTION_DATABASE_URL is required");

const fromConfig = createConfig();
loadDatabaseConfigFromURL(fromDatabaseURL, fromConfig);

const fromKnex = Knex(getKnexConfig(fromConfig));
const s3 = getS3Client();

const buildUrl = process.argv[2];

const spinner = ora(`Importing`).start();

if (!buildUrl || !URL.canParse(buildUrl)) {
  spinner.fail(`Invalid URL`);
  process.exit(1);
}

const buildUrlObj = new URL(buildUrl);

if (buildUrlObj.hostname !== "app.argos-ci.com") {
  spinner.fail(`You can only import builds from app.argos-ci.com`);
  process.exit(1);
}

// Match /:account/:project/builds/:buildId
const buildMatch = buildUrlObj.pathname.match(
  /^\/([^/]+)\/([^/]+)\/builds\/(\d+)/,
);

if (!buildMatch) {
  spinner.fail(`Invalid URL`);
  process.exit(1);
}

const [, accountSlug, projectName, buildNumber] = buildMatch;

if (!accountSlug || !projectName || !buildNumber) {
  spinner.fail(`Invalid URL`);
  process.exit(1);
}

spinner.text = `Fetching project ${projectName}`;

const project = await Project.query(fromKnex)
  .withGraphJoined("account")
  .where("projects.name", projectName)
  .where("account.slug", accountSlug)
  .first();

if (!project) {
  spinner.fail(`Project not found`);
  process.exit(1);
}

const projectId = project?.id;

const toProject = await Project.query()
  .where("name", "big")
  .withGraphFetched("account")
  .first();

if (!toProject) {
  spinner.fail(`No "big" project found`);
  process.exit(1);
}

const toProjectId = toProject.id;

invariant(toProject.account, "Account must be fetched");

const toProjectBaseUrl = `${config.get("server.url")}/${toProject.account.slug}/${toProject.name}`;

spinner.text = `Fetching build`;

const build = await Build.query(fromKnex)
  .withGraphFetched(
    "[screenshotDiffs.[file,test,compareScreenshot,baseScreenshot], baseScreenshotBucket.screenshots.[test,file,playwrightTraceFile], compareScreenshotBucket.screenshots.[test,file,playwrightTraceFile]]",
  )
  .where("number", buildNumber)
  .where("projectId", projectId)
  .first();

if (!build) {
  throw new Error("Build not found");
}

spinner.text = `Uploading screenshots for build`;

const allScreenshots = (() => {
  const screenshots: Screenshot[] = [];
  if (build.baseScreenshotBucket) {
    invariant(
      build.baseScreenshotBucket.screenshots,
      "Screenshots must be fetched",
    );
    screenshots.push(...build.baseScreenshotBucket.screenshots);
  }

  invariant(
    build.compareScreenshotBucket?.screenshots,
    "Screenshots must be fetched",
  );

  screenshots.push(...build.compareScreenshotBucket.screenshots);

  return screenshots;
})();

const allFiles = (() => {
  const files: File[] = [];
  for (const screenshot of allScreenshots) {
    const file = screenshot.file;
    invariant(file, "Screenshot must have a file");
    if (!files.some((f) => f.key === file.key)) {
      files.push(file);
    }

    const traceFile = screenshot.playwrightTraceFile;
    if (traceFile) {
      if (!files.some((f) => f.key === traceFile.key)) {
        files.push(traceFile);
      }
    }
  }

  invariant(build.screenshotDiffs, "Screenshot diffs must be fetched");

  for (const diff of build.screenshotDiffs) {
    const file = diff.file;
    if (!file) {
      continue;
    }
    if (!files.some((f) => f.key === file.key)) {
      files.push(file);
    }
  }

  return files;
})();

const fileChunks = chunk(allFiles, 20);

let count = 1;
for (const files of fileChunks) {
  spinner.text = `Uploading files to S3 ${count}/${allFiles.length}`;
  await Promise.all(files.map((file) => uploadFile(file)));
  count += files.length;
}

spinner.text = "Inserting files...";
const newFiles = await File.query()
  .insertAndFetch(allFiles.map(toJSON))
  .onConflict("key")
  .merge();

spinner.text = "Inserting buckets...";
const newBaseScreenshotBucket = await (async () => {
  if (build.baseScreenshotBucket) {
    return ScreenshotBucket.query().insertAndFetch({
      ...toJSON(build.baseScreenshotBucket),
      projectId: toProjectId,
    });
  }
  return null;
})();

invariant(
  build.compareScreenshotBucket,
  "Compare screenshot bucket must exist",
);

const newCompareScreenshotBucket =
  await ScreenshotBucket.query().insertAndFetch({
    ...toJSON(build.compareScreenshotBucket),
    projectId: toProjectId,
  });

spinner.text = "Inserting build...";

const newBuild = await Build.query().insertAndFetch({
  ...toJSON(build),
  projectId: toProjectId,
  baseScreenshotBucketId: newBaseScreenshotBucket?.id ?? null,
  compareScreenshotBucketId: newCompareScreenshotBucket.id,
  githubPullRequestId: null,
});

spinner.text = "Inserting tests...";

const existingTests = await Test.query()
  .where("projectId", toProjectId)
  .where("buildName", build.name);

const toInsertTests = allScreenshots
  .map((screenshot) => {
    const test = screenshot.test;
    invariant(test, "Screenshot must have a test");
    return {
      ...toJSON(test),
      projectId: toProjectId,
    };
  })
  .filter((test) => {
    return !existingTests.some((t) => t.name === test.name);
  });

const insertedTests =
  toInsertTests.length > 0
    ? await Test.query().insertAndFetch(toInsertTests)
    : [];
const newTests = [...existingTests, ...insertedTests];

spinner.text = "Inserting screenshots...";

const newScreenshots = await Screenshot.query().insertAndFetch(
  allScreenshots.map((screenshot) => {
    const file = screenshot.file;
    invariant(file, "Screenshot must have a file");
    const newFile = newFiles.find((f) => f.key === file.key);
    invariant(newFile, "New file must exist");
    const bucket =
      screenshot.screenshotBucketId === build.baseScreenshotBucketId
        ? newBaseScreenshotBucket
        : newCompareScreenshotBucket;
    invariant(bucket, "Bucket must exist");
    const test = newTests.find((t) => t.name === screenshot.name);
    invariant(test, "Test must exist");
    const traceFile = screenshot.playwrightTraceFile
      ? newFiles.find((f) => f.key === screenshot.playwrightTraceFile?.key)
      : null;
    return {
      ...toJSON(screenshot),
      number: undefined,
      fileId: newFile.id,
      testId: test.id,
      screenshotBucketId: bucket.id,
      playwrightTraceFileId: traceFile?.id ?? null,
      buildShardId: null,
    };
  }),
);

spinner.text = "Inserting diffs...";

const screenshotDiffs = build.screenshotDiffs;

invariant(screenshotDiffs, "Screenshot diffs must be fetched");

await ScreenshotDiff.query().insert(
  screenshotDiffs.map((diff) => {
    const file = diff.file;
    const newFile = file ? newFiles.find((f) => f.key === file.key) : null;
    const { baseScreenshot, compareScreenshot } = diff;
    const screenshot = baseScreenshot ?? compareScreenshot;
    invariant(screenshot, "Screenshot must exist");
    const test = newTests.find((t) => t.name === screenshot.name);
    invariant(test, "Test must exist");
    const newBaseScreenshot =
      baseScreenshot && newBaseScreenshotBucket
        ? newScreenshots.find(
            (s) =>
              s.name === baseScreenshot.name &&
              s.screenshotBucketId === newBaseScreenshotBucket?.id,
          )
        : null;
    const newCompareScreenshot = compareScreenshot
      ? newScreenshots.find(
          (s) =>
            s.name === compareScreenshot.name &&
            s.screenshotBucketId === newCompareScreenshotBucket.id,
        )
      : null;
    return {
      ...toJSON(diff),
      number: undefined,
      fileId: newFile?.id ?? null,
      testId: test.id,
      baseScreenshotId: newBaseScreenshot?.id ?? null,
      compareScreenshotId: newCompareScreenshot?.id ?? null,
      buildId: newBuild.id,
    };
  }),
);

spinner.succeed(
  `Build imported: ${toProjectBaseUrl}/builds/${newBuild.number}`,
);

process.exit(0);

async function uploadFile(file: File) {
  const fileURL = `https://files.argos-ci.com/${file.key}?tr=orig-true`;
  const response = await fetch(fileURL);
  const arrayBuffer = await response.arrayBuffer();
  await uploadFromBuffer({
    s3,
    Bucket: config.get("s3.screenshotsBucket"),
    buffer: Buffer.from(arrayBuffer),
    Key: file.key,
    contentType: "image/png",
  });
}

function toJSON(model: Model) {
  const attrs = JSON.parse(JSON.stringify(model.toJSON()));
  delete attrs.id;
  return attrs;
}
