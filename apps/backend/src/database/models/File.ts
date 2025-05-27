import { Model } from "../util/model.js";
import { timestampsSchema } from "../util/schemas.js";

export class File extends Model {
  static override tableName = "files";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["key", "type"],
        properties: {
          key: { type: ["string"] },
          width: { type: ["number", "null"], minimum: 0 },
          height: { type: ["number", "null"], minimum: 0 },
          type: {
            type: "string",
            enum: ["screenshot", "screenshotDiff", "playwrightTrace"],
          },
        },
      },
    ],
  };

  key!: string;
  width!: number | null;
  height!: number | null;
  type!: "screenshot" | "screenshotDiff" | "playwrightTrace";
}
