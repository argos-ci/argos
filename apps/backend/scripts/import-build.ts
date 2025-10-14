import { invariant } from "@argos/util/invariant";
import Knex from "knex";
import ora from "ora";

import config, { createConfig } from "@/config";
import { getKnexConfig, loadDatabaseConfigFromURL } from "@/config/database";
import {
  Artifact,
  ArtifactBucket,
  ArtifactDiff,
  Build,
  File,
  Model,
  Project,
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
    "[artifactDiffs.[file,test,headArtifact,baseArtifact], baseArtifactBucket.artifacts.[test,file,playwrightTraceFile], headArtifactBucket.artifacts.[test,file,playwrightTraceFile]]",
  )
  .where("number", buildNumber)
  .where("projectId", projectId)
  .first();

if (!build) {
  throw new Error("Build not found");
}

spinner.text = `Uploading artifacts for build`;

const allArtifacts = (() => {
  const artifacts: Artifact[] = [];
  if (build.baseArtifactBucket) {
    invariant(build.baseArtifactBucket.artifacts, "Artifacts must be fetched");
    artifacts.push(...build.baseArtifactBucket.artifacts);
  }

  invariant(build.headArtifactBucket?.artifacts, "Artifacts must be fetched");

  artifacts.push(...build.headArtifactBucket.artifacts);

  return artifacts;
})();

const allFiles = (() => {
  const files: File[] = [];
  for (const artifact of allArtifacts) {
    const file = artifact.file;
    invariant(file, "Artifact must have a file");
    if (!files.some((f) => f.key === file.key)) {
      files.push(file);
    }

    const traceFile = artifact.playwrightTraceFile;
    if (traceFile) {
      if (!files.some((f) => f.key === traceFile.key)) {
        files.push(traceFile);
      }
    }
  }

  invariant(build.artifactDiffs, "Artifact diffs must be fetched");

  for (const diff of build.artifactDiffs) {
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
const newBaseArtifactBucket = await (async () => {
  if (build.baseArtifactBucket) {
    return ArtifactBucket.query().insertAndFetch({
      ...toJSON(build.baseArtifactBucket),
      projectId: toProjectId,
    });
  }
  return null;
})();

invariant(build.headArtifactBucket, "Compare artifact bucket must exist");

const newHeadArtifactBucket = await ArtifactBucket.query().insertAndFetch({
  ...toJSON(build.headArtifactBucket),
  projectId: toProjectId,
});

spinner.text = "Inserting build...";

const newBuild = await Build.query().insertAndFetch({
  ...toJSON(build),
  projectId: toProjectId,
  baseArtifactBucketId: newBaseArtifactBucket?.id ?? null,
  headArtifactBucketId: newHeadArtifactBucket.id,
  githubPullRequestId: null,
});

spinner.text = "Inserting tests...";

const existingTests = await Test.query()
  .where("projectId", toProjectId)
  .where("buildName", build.name);

const toInsertTests = allArtifacts
  .map((artifact) => {
    const test = artifact.test;
    invariant(test, "Artifact must have a test");
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

spinner.text = "Inserting artifacts...";

const newArtifacts = await Artifact.query().insertAndFetch(
  allArtifacts.map((artifact) => {
    const file = artifact.file;
    invariant(file, "Artifact must have a file");
    const newFile = newFiles.find((f) => f.key === file.key);
    invariant(newFile, "New file must exist");
    const bucket =
      artifact.artifactBucketId === build.baseArtifactBucketId
        ? newBaseArtifactBucket
        : newHeadArtifactBucket;
    invariant(bucket, "Bucket must exist");
    const test = newTests.find((t) => t.name === artifact.name);
    invariant(test, "Test must exist");
    const traceFile = artifact.playwrightTraceFile
      ? newFiles.find((f) => f.key === artifact.playwrightTraceFile?.key)
      : null;
    return {
      ...toJSON(artifact),
      number: undefined,
      fileId: newFile.id,
      testId: test.id,
      artifactBucketId: bucket.id,
      playwrightTraceFileId: traceFile?.id ?? null,
      buildShardId: null,
    };
  }),
);

spinner.text = "Inserting diffs...";

const artifactDiffs = build.artifactDiffs;

invariant(artifactDiffs, "Artifact diffs must be fetched");

await ArtifactDiff.query().insert(
  artifactDiffs.map((diff) => {
    const file = diff.file;
    const newFile = file ? newFiles.find((f) => f.key === file.key) : null;
    const { baseArtifact, headArtifact } = diff;
    const artifact = baseArtifact ?? headArtifact;
    invariant(artifact, "Artifact must exist");
    const test = newTests.find((t) => t.name === artifact.name);
    invariant(test, "Test must exist");
    const newBaseArtifact =
      baseArtifact && newBaseArtifactBucket
        ? newArtifacts.find(
            (s) =>
              s.name === baseArtifact.name &&
              s.artifactBucketId === newBaseArtifactBucket?.id,
          )
        : null;
    const newHeadArtifact = headArtifact
      ? newArtifacts.find(
          (s) =>
            s.name === headArtifact.name &&
            s.artifactBucketId === newHeadArtifactBucket.id,
        )
      : null;
    return {
      ...toJSON(diff),
      number: undefined,
      fileId: newFile?.id ?? null,
      testId: test.id,
      baseArtifactId: newBaseArtifact?.id ?? null,
      headArtifactId: newHeadArtifact?.id ?? null,
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
