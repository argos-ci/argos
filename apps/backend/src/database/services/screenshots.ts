import { checkIsNonNullable } from "@argos/util/checkIsNonNullable";
import { invariant } from "@argos/util/invariant";
import type { PartialModelObject, TransactionOrKnex } from "objection";

import { transaction } from "@/database/index.js";
import {
  Build,
  BuildShard,
  File,
  Screenshot,
  Test,
} from "@/database/models/index.js";
import { ARGOS_STORYBOOK_SDK_NAME } from "@/util/argos-sdk.js";

import { ScreenshotMetadata } from "../schemas/ScreenshotMetadata.js";
import { getUnknownFileKeys } from "./file.js";

const getOrCreateTests = async ({
  projectId,
  buildName,
  screenshotNames,
  trx,
}: {
  projectId: string;
  buildName: string;
  screenshotNames: string[];
  trx: TransactionOrKnex;
}) => {
  const tests: Test[] = await Test.query(trx)
    .where({ projectId, buildName })
    .whereIn("name", screenshotNames);
  const testNames = tests.map(({ name }: Test) => name);
  const testNamesToAdd = screenshotNames.filter(
    (screenshotName) => !testNames.includes(screenshotName),
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
  screenshots: {
    key: string;
    name: string;
    metadata?: ScreenshotMetadata | null | undefined;
    pwTraceKey?: string | null | undefined;
    threshold?: number | null | undefined;
    baseName?: string | null | undefined;
    contentType: string;
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
  const screenshots = params.screenshots;

  if (screenshots.length === 0) {
    return { all: 0, storybook: 0 };
  }

  const screenshotByKey = screenshots.reduce<
    Record<string, InsertFilesAndScreenshotsParams["screenshots"][number]>
  >((acc, screenshot) => {
    acc[screenshot.key] = screenshot;
    return acc;
  }, {});

  const screenshotKeys = Object.keys(screenshotByKey);
  const pwTraceKeys = screenshots
    .map((screenshot) => screenshot.pwTraceKey)
    .filter(checkIsNonNullable);

  const unknownKeys = await getUnknownFileKeys(
    [...screenshotKeys, ...pwTraceKeys],
    params.trx,
  );

  return await transaction(params.trx, async (trx) => {
    if (params.screenshots.length === 0) {
      return { all: 0, storybook: 0 };
    }

    if (unknownKeys.length > 0) {
      await File.query(trx)
        .insert(
          unknownKeys.map((key) => {
            if (pwTraceKeys.includes(key)) {
              return {
                key,
                type: "playwrightTrace" as const,
                contentType: "application/zip",
              };
            }
            const screenshot = screenshotByKey[key];
            invariant(screenshot, `Screenshot not found for key ${key}`);
            return {
              key,
              type: "screenshot" as const,
              contentType: screenshot.contentType,
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
        screenshotNames: params.screenshots.map(
          (screenshot) => screenshot.name,
        ),
        trx,
      }),
      Screenshot.query(trx)
        .select("name")
        .where({
          name: params.screenshots.map((screenshot) => screenshot.name),
          screenshotBucketId: params.build.compareScreenshotBucketId,
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

    // Insert screenshots
    await Screenshot.query(trx).insert(
      params.screenshots.map((screenshot): PartialModelObject<Screenshot> => {
        const file = files.find((f) => f.key === screenshot.key);
        invariant(file, `File not found for key ${screenshot.key}`);

        const test = tests.find((t) => t.name === screenshot.name);
        invariant(test, `Test not found for screenshot ${screenshot.name}`);

        const pwTraceFile = (() => {
          if (screenshot.pwTraceKey) {
            const pwTraceFile = files.find(
              (f) => f.key === screenshot.pwTraceKey,
            );
            invariant(
              pwTraceFile,
              `File not found for key ${screenshot.pwTraceKey}`,
            );
            invariant(
              pwTraceFile.type === "playwrightTrace",
              `File ${screenshot.pwTraceKey} is not a playwright trace`,
            );
            return pwTraceFile;
          }
          return null;
        })();

        return {
          screenshotBucketId: params.build.compareScreenshotBucketId,
          name: screenshot.name,
          s3Id: screenshot.key,
          fileId: file.id,
          testId: test.id,
          metadata: screenshot.metadata ?? null,
          playwrightTraceFileId: pwTraceFile?.id ?? null,
          buildShardId: params.shard?.id ?? null,
          threshold: screenshot.threshold ?? null,
          baseName: screenshot.baseName ?? null,
        };
      }),
    );

    return {
      all: params.screenshots.length,
      storybook: params.screenshots.filter(
        (screenshot) =>
          screenshot.metadata?.sdk.name === ARGOS_STORYBOOK_SDK_NAME,
      ).length,
    };
  });
}
