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
    },
  });

  key!: string;
  width!: number | null;
  height!: number | null;
}
