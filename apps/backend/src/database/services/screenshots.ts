import { checkIsNonNullable } from "@argos/util/checkIsNonNullable";
import { invariant } from "@argos/util/invariant";
import type { PartialModelObject, TransactionOrKnex } from "objection";

import { transaction } from "@/database/index.js";
import {
  Artifact,
  Build,
  BuildShard,
  File,
  Test,
} from "@/database/models/index.js";
import { ARGOS_STORYBOOK_SDK_NAME } from "@/util/argos-sdk.js";

import { ScreenshotMetadata } from "../schemas/ScreenshotMetadata.js";
import { getUnknownFileKeys } from "./file.js";

const getOrCreateTests = async ({
  projectId,
  buildName,
  artifactNames,
  trx,
}: {
  projectId: string;
  buildName: string;
  artifactNames: string[];
  trx: TransactionOrKnex;
}) => {
  const tests: Test[] = await Test.query(trx)
    .where({ projectId, buildName })
    .whereIn("name", artifactNames);
  const testNames = tests.map(({ name }: Test) => name);
  const testNamesToAdd = artifactNames.filter(
    (artifactName) => !testNames.includes(artifactName),
  );
  if (testNamesToAdd.length === 0) {
    return tests;
  }

  const addedTests = await Test.query(trx).insertAndFetch(
    testNamesToAdd.map((name) => ({
      name: name,
      projectId,
      buildName,
    })),
  );
  return [...tests, ...addedTests];
};

type InsertFilesAndScreenshotsParams = {
  artifacts: {
    key: string;
    name: string;
    metadata?: ScreenshotMetadata | null | undefined;
    pwTraceKey?: string | null | undefined;
    threshold?: number | null | undefined;
    baseName?: string | null | undefined;
  }[];
  build: Build;
  shard?: BuildShard | null | undefined;
  trx?: TransactionOrKnex;
};

/**
 * @returns The number of screenshots inserted
 */
export async function insertFilesAndScreenshots(
  params: InsertFilesAndScreenshotsParams,
): Promise<{
  all: number;
  storybook: number;
}> {
  const { artifacts } = params;

  if (artifacts.length === 0) {
    return { all: 0, storybook: 0 };
  }

  const screenshotKeys = artifacts.map((artifact) => artifact.key);
  const pwTraceKeys = artifacts
    .map((artifact) => artifact.pwTraceKey)
    .filter(checkIsNonNullable);

  const unknownKeys = await getUnknownFileKeys(
    [...screenshotKeys, ...pwTraceKeys],
    params.trx,
  );

  return await transaction(params.trx, async (trx) => {
    if (params.artifacts.length === 0) {
      return { all: 0, storybook: 0 };
    }

    if (unknownKeys.length > 0) {
      await File.query(trx)
        .insert(
          unknownKeys.map((key) => {
            const isPwTrace = pwTraceKeys.includes(key);
            return {
              key,
              type: isPwTrace
                ? ("playwrightTrace" as const)
                : ("screenshot" as const),
            };
          }),
        )
        .onConflict("key")
        .ignore();
    }

    const [files, tests, duplicates] = await Promise.all([
      File.query(trx)
        .select("id", "key", "type")
        .whereIn("key", [...screenshotKeys, ...pwTraceKeys]),
      getOrCreateTests({
        projectId: params.build.projectId,
        buildName: params.build.name,
        artifactNames: params.artifacts.map((artifact) => artifact.name),
        trx,
      }),
      Artifact.query(trx)
        .select("name")
        .where({
          name: params.artifacts.map((artifact) => artifact.name),
          artifactBucketId: params.build.headArtifactBucketId,
        }),
    ]);

    if (duplicates.length > 0) {
      throw new Error(
        `Screenshots already uploaded for ${duplicates
          .map((screenshot) => screenshot.name)
          .join(
            ", ",
          )}. Please ensure to not upload a screenshot with the same name multiple times.`,
      );
    }

    // Insert artifacts
    await Artifact.query(trx).insert(
      params.artifacts.map((artifact): PartialModelObject<Artifact> => {
        const file = files.find((f) => f.key === artifact.key);
        invariant(file, `File not found for key ${artifact.key}`);

        const test = tests.find((t) => t.name === artifact.name);
        invariant(test, `Test not found for artifact ${artifact.name}`);

        const pwTraceFile = (() => {
          if (artifact.pwTraceKey) {
            const pwTraceFile = files.find(
              (f) => f.key === artifact.pwTraceKey,
            );
            invariant(
              pwTraceFile,
              `File not found for key ${artifact.pwTraceKey}`,
            );
            invariant(
              pwTraceFile.type === "playwrightTrace",
              `File ${artifact.pwTraceKey} is not a playwright trace`,
            );
            return pwTraceFile;
          }
          return null;
        })();

        return {
          artifactBucketId: params.build.headArtifactBucketId,
          name: artifact.name,
          s3Id: artifact.key,
          fileId: file.id,
          testId: test.id,
          metadata: artifact.metadata ?? null,
          playwrightTraceFileId: pwTraceFile?.id ?? null,
          buildShardId: params.shard?.id ?? null,
          threshold: artifact.threshold ?? null,
          baseName: artifact.baseName ?? null,
        };
      }),
    );

    return {
      all: params.artifacts.length,
      storybook: params.artifacts.filter(
        (artifact) => artifact.metadata?.sdk.name === ARGOS_STORYBOOK_SDK_NAME,
      ).length,
    };
  });
}
