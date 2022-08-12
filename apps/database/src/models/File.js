import { Model, mergeSchemas, timestampsSchema } from "../util";

export class File extends Model {
  static get tableName() {
    return "files";
  }

  static get jsonSchema() {
    return mergeSchemas(timestampsSchema, {
      required: ["key"],
      properties: {
        key: { type: ["string"] },
      },
    });
  }

  /** @type {string} */
  key;
}
