import { z } from "zod";

const LocationSchema = z
  .object({
    file: z.string().meta({ description: "The located file" }),
    line: z
      .number()
      .int()
      .min(0)
      .meta({ description: "The line number in the file" }),
    column: z
      .number()
      .int()
      .min(0)
      .meta({ description: "The column number in the file" }),
  })
  .meta({ description: "Indicate a location in the source code" });

const TestAnnotationSchema = z
  .object({
    type: z.string().meta({ description: "The type of annotation" }),
    description: z
      .string()
      .optional()
      .meta({ description: "The description of the annotation" }),
  })
  .meta({ description: "An annotation attached to a test" });

/**
 * Maximum number of tests a single report can carry. Well above any real suite
 * — the cap exists so a malformed payload can't be used to make the server
 * allocate without bound.
 */
const MAX_TESTS_PER_REPORT = 20_000;

const TestReportTestSchema = z
  .object({
    id: z
      .string()
      .max(255)
      .nullish()
      .meta({
        description:
          "The test runner's own identifier for the test, unique within the run. " +
          "Screenshots carrying the same identifier in `test.id` are attached to it.",
      }),
    titlePath: z
      .array(z.string())
      .min(1)
      .meta({
        description:
          "The path of titles leading to the test, starting at the test file: " +
          "`[file, ...describes, title]`. It is the test's identity across builds.",
      }),
    project: z
      .string()
      .max(255)
      .nullish()
      .meta({
        description:
          "The test runner project the test ran under (a browser or a device). " +
          "The same test running under several projects is one test, run several times.",
      }),
    location: LocationSchema.optional(),
    tags: z
      .array(z.string())
      .optional()
      .meta({ description: "Tags associated with the test" }),
    annotations: z
      .array(TestAnnotationSchema)
      .optional()
      .meta({ description: "Annotations attached to the test" }),
    status: z
      .enum(["passed", "failed", "timedOut", "skipped", "interrupted"])
      .meta({ description: "How the test ended" }),
    outcome: z
      .enum(["expected", "unexpected", "flaky", "skipped"])
      .optional()
      .meta({
        description:
          "How the test ended relative to what was expected. A test expected to " +
          "fail and failing is `expected`; a test passing on retry is `flaky`.",
      }),
    duration: z
      .number()
      .min(0)
      .optional()
      .meta({ description: "Duration of the test in milliseconds" }),
    retry: z
      .number()
      .int()
      .min(0)
      .optional()
      .meta({ description: "Index of the retry the result comes from" }),
    retries: z.number().int().min(0).optional().meta({
      description: "Maximum number of retries configured for the test",
    }),
  })
  // No `id` in the metadata on purpose: naming the schema makes `toJSONSchema`
  // emit a `$defs` entry and a `$ref` to it, and the JSON schema is handed to
  // Ajv through the Build model without its `$defs`, which then fails to
  // resolve the reference.
  .meta({ description: "A test of the run" });

export const BuildMetadataSchema = z
  .object({
    testReport: z
      .object({
        status: z
          .enum(["passed", "failed", "timedout", "interrupted"])
          .meta({ description: "Status of the test suite" }),
        stats: z
          .object({
            startTime: z
              .string()
              .optional()
              .meta({ description: "Date when the test suite started" }),
            duration: z.number().optional().meta({
              description: "Duration of the test suite in milliseconds",
            }),
          })
          .optional(),
        tests: z
          .array(TestReportTestSchema)
          .max(MAX_TESTS_PER_REPORT)
          .optional()
          .meta({
            description:
              "Every test of the run, including the ones that took no " +
              "screenshot and the ones that were skipped. This is what lets " +
              "Argos tell a test with no visual coverage from a test it has " +
              "never heard of.",
          }),
      })
      .optional()
      .meta({ description: "Test suite report" }),
  })
  .meta({ description: "Metadata associated to the build" });

export type BuildMetadata = z.infer<typeof BuildMetadataSchema>;
export type TestReportTest = z.infer<typeof TestReportTestSchema>;

export const BuildMetadataJsonSchema = z.toJSONSchema(BuildMetadataSchema);

/**
 * The metadata as it is persisted on the build and its shards.
 *
 * The test list is consumed into `flows` and `flow_runs` rows on the way in, so
 * keeping it here too would store a second, unqueryable copy of a payload that
 * can reach tens of thousands of entries — and it would be copied again by the
 * shard aggregation.
 */
export function stripTestsFromBuildMetadata(
  metadata: BuildMetadata | null,
): BuildMetadata | null {
  if (!metadata?.testReport?.tests) {
    return metadata;
  }
  const { tests: _tests, ...testReport } = metadata.testReport;
  return { ...metadata, testReport };
}
