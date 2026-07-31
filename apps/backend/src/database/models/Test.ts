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

    const testId = formatTestId({
      projectName: this.project.name,
      testId: this.id,
    });
    const pathname = `/${this.project.account.slug}/${this.project.name}/tests/${testId}`;

    return `${config.get("server.url")}${pathname}`;
  }
}
