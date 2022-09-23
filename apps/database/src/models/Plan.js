import { Model, mergeSchemas, timestampsSchema } from "../util";

export class Plan extends Model {
  static get tableName() {
    return "plans";
  }

  static get jsonSchema() {
    return mergeSchemas(timestampsSchema, {
      required: ["name", "screenshotsLimitPerMonth", "githubId"],
      properties: {
        name: { type: "string" },
        screenshotsLimitPerMonth: { type: "number" },
        githubId: { type: "number" },
      },
    });
  }

  static get virtualAttributes() {
    return ["screenshotsMonthlyLimit"];
  }

  get screenshotsMonthlyLimit() {
    return this.screenshotsLimitPerMonth === -1
      ? Infinity
      : this.screenshotsLimitPerMonth;
  }

  static async getFreePlan() {
    const freePlan = await Plan.query().findOne({ name: "free" });
    return freePlan || null;
  }
}
