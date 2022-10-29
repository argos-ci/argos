import { Model as ObjectionModel } from "objection";

import { knex } from "../knex";

ObjectionModel.knex(knex);

export class Model extends ObjectionModel {
  // Centralize the models.
  static get modelPaths() {
    return [__dirname];
  }

  $beforeInsert() {
    if (!this.createdAt) {
      this.createdAt = new Date().toISOString();
    }

    this.updatedAt = new Date().toISOString();
  }

  $beforeUpdate() {
    this.updatedAt = new Date().toISOString();
  }

  async reload(queryContext = {}) {
    const model = await this.$query(queryContext.transaction);
    Object.assign(this, model);
    return this;
  }
}
