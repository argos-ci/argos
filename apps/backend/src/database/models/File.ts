import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";

export class File extends Model {
  static override tableName = "files";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["key"],
    properties: {
      key: { type: ["string"] },
      width: { type: ["number", "null"], minimum: 0 },
      height: { type: ["number", "null"], minimum: 0 },
      type: {
        type: ["string", "null"],
        enum: ["screenshot", "screenshotDiff", "playwrightTrace"],
      },
    },
  });

  key!: string;
  width!: number | null;
  height!: number | null;
  type!: "screenshot" | "screenshotDiff" | "playwrightTrace" | null;
}
