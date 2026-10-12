import { invariant } from "@argos/util/invariant";
import type { RelationMappings, TransactionOrKnex } from "objection";

import config from "@/config";
import { formatTestId } from "@/util/test-id";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Comment } from "./Comment";
import { Project } from "./Project";
import { Screenshot } from "./Screenshot";
import { ScreenshotDiff } from "./ScreenshotDiff";

export class Test extends Model {
  static override tableName = "tests";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["name", "projectId", "buildName"],
        properties: {
          name: { type: "string", maxLength: 1024 },
          projectId: { type: "string" },
          buildName: { type: "string", maxLength: 255 },
        },
      },
    ],
  };

  name!: string;
  projectId!: string;
  buildName!: string;

  static override get relationMappings(): RelationMappings {
    return {
      project: {
        relation: Model.BelongsToOneRelation,
        modelClass: Project,
        join: {
          from: "tests.projectId",
          to: "projects.id",
        },
      },
      screenshots: {
        relation: Model.HasManyRelation,
        modelClass: Screenshot,
        join: {
          from: "tests.id",
          to: "screenshots.testId",
        },
      },
      screenshotDiffs: {
        relation: Model.HasManyRelation,
        modelClass: ScreenshotDiff,
        join: {
          from: "tests.id",
          to: "screenshot_diffs.testId",
        },
      },
      comments: {
        relation: Model.HasManyRelation,
        modelClass: Comment,
        join: {
          from: "tests.id",
          to: "comments.testId",
        },
      },
    };
  }

  project?: Project;
  screenshotDiffs?: ScreenshotDiff[];
  screenshots?: Screenshot[];
  comments?: Comment[];

  /**
   * URL of the test page, used to link back to a test from outside the app
   * (notification emails, integrations).
   */
  async getUrl({ trx }: { trx?: TransactionOrKnex } = {}) {
    if (!this.project?.account) {
      await this.$fetchGraph(
        "project.account",
        trx ? { transaction: trx } : undefined,
      );
    }
    invariant(this.project?.account, "account not found");

    return getTestUrl({
      accountSlug: this.project.account.slug,
      projectName: this.project.name,
      testId: this.id,
    });
  }
}

/**
 * URL of a test page, from the names a query already holds.
 */
export function getTestUrl(input: {
  accountSlug: string;
  projectName: string;
  testId: string;
}) {
  const testId = formatTestId({
    projectName: input.projectName,
    testId: input.testId,
  });
  const pathname = `/${input.accountSlug}/${input.projectName}/tests/${testId}`;
  return `${config.get("server.url")}${pathname}`;
}
