import { invariant } from "@argos/util/invariant";

import { transaction } from "@/database/index.js";
import { Artifact, ArtifactDiff, Build } from "@/database/models/index.js";
import type { ArtifactBucket } from "@/database/models/index.js";

import { BuildStrategy, getBuildStrategy } from "./strategy/index.js";

/**
 * Get the base screenshot bucket for a build, or retrieve it if it doesn't exist.
 */
async function getOrRetrieveBaseArtifactBucket<T>(input: {
  build: Build;
  strategy: BuildStrategy<T>;
  ctx: T;
}): Promise<ArtifactBucket | null> {
  const { build, strategy, ctx } = input;
  if (build.baseArtifactBucket) {
    return build.baseArtifactBucket;
  }

  const { baseBranch, baseBranchResolvedFrom, baseArtifactBucket } =
    await strategy.getBase(build, ctx);

  await Promise.all([
    Build.query()
      .findById(build.id)
      .patch({
        baseBranch,
        baseBranchResolvedFrom,
        baseArtifactBucketId: baseArtifactBucket?.id ?? null,
      }),
    baseArtifactBucket?.$fetchGraph("screenshots"),
  ]);

  return baseArtifactBucket;
}

function getJobStatus({
  baseArtifact,
  sameFileId,
  headArtifact,
}: {
  baseArtifact: Artifact | null;
  sameFileId: boolean;
  headArtifact: Artifact;
}) {
  if (
    baseArtifact &&
    (baseArtifact.fileId === null ||
      baseArtifact.file?.width == null ||
      baseArtifact.file?.height == null)
  ) {
    return "pending" as const;
  }

  if (
    headArtifact.fileId === null ||
    headArtifact.file?.width == null ||
    headArtifact.file?.height == null
  ) {
    return "pending" as const;
  }

  if (!baseArtifact) {
    return "complete" as const;
  }

  if (sameFileId) {
    return "complete" as const;
  }

  return "pending" as const;
}

export async function createBuildDiffs(build: Build) {
  // If the build already has a type, it means the diffs have already been created.
  if (build.type) {
    return ArtifactDiff.query().where({ buildId: build.id });
  }

  const strategy = getBuildStrategy(build);

  const richBuild = await build
    .$query()
    .withGraphFetched(
      "[project, baseArtifactBucket.artifacts.file, headArtifactBucket.artifacts.file]",
    );

  const project = richBuild.project;
  invariant(project, "no project found for build");

  const headArtifactBucket = richBuild.headArtifactBucket;
  invariant(headArtifactBucket, "no compare screenshot bucket found for build");

  invariant(headArtifactBucket.complete, "compare bucket is not complete");

  const headArtifacts = headArtifactBucket.artifacts;
  invariant(headArtifacts, "no compare artifacts found for build");

  const ctx = await strategy.getContext(richBuild);
  const baseArtifactBucket = await getOrRetrieveBaseArtifactBucket({
    build: richBuild,
    strategy,
    ctx,
  });

  const sameBucket = Boolean(
    baseArtifactBucket && baseArtifactBucket.id === headArtifactBucket.id,
  );

  const inserts = headArtifacts.map((artifact) => {
    const baseArtifact = (() => {
      if (sameBucket) {
        return null;
      }

      if (!baseArtifactBucket) {
        return null;
      }

      // Don't create diffs for failure artifacts
      if (ArtifactDiff.artifactFailureRegexp.test(artifact.name)) {
        return null;
      }

      invariant(
        baseArtifactBucket.artifacts,
        "no base artifacts found for build",
      );

      return baseArtifactBucket.artifacts.find(({ name }) => {
        if (artifact.baseName) {
          return name === artifact.baseName;
        }
        return name === artifact.name;
      });
    })();

    const sameFileId = Boolean(
      baseArtifact?.fileId &&
        artifact.fileId &&
        baseArtifact.fileId === artifact.fileId,
    );

    return {
      buildId: richBuild.id,
      baseArtifactId: baseArtifact ? baseArtifact.id : null,
      headArtifactId: artifact.id,
      jobStatus: getJobStatus({
        baseArtifact: baseArtifact ?? null,
        sameFileId,
        headArtifact: artifact,
      }),
      score: sameFileId ? 0 : null,
      testId: artifact.testId,
    };
  });

  const headArtifactNames = headArtifacts.map(({ name }) => name);

  const removedArtifacts =
    baseArtifactBucket?.artifacts
      ?.filter(
        ({ name }) =>
          !headArtifactNames.includes(name) &&
          // Don't mark failure artifacts as removed
          !ArtifactDiff.artifactFailureRegexp.test(name),
      )
      .map((baseArtifact) => ({
        buildId: richBuild.id,
        baseArtifactId: baseArtifact.id,
        headArtifactId: null,
        jobStatus: "complete" as const,
        score: null,
        testId: baseArtifact.testId,
      })) ?? [];

  const allInserts = [...inserts, ...removedArtifacts];

  const buildType = strategy.getBuildType(
    {
      baseArtifactBucket,
      headArtifactBucket,
    },
    ctx,
  );

  return transaction(async (trx) => {
    const [screenshots] = await Promise.all([
      allInserts.length > 0
        ? ArtifactDiff.query(trx).insertAndFetch(allInserts)
        : [],
      Build.query(trx).findById(build.id).patch({ type: buildType }),
    ]);

    return screenshots;
  });
}
