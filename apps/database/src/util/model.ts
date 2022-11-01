import { Model as ObjectionModel } from "objection";
import type { ModelOptions, QueryContext, TransactionOrKnex } from "objection";

import { knex } from "../knex.js";

ObjectionModel.knex(knex);

export class Model extends ObjectionModel {
  id!: string;
  createdAt!: string;
  updatedAt!: string;

  override $beforeInsert(_queryContext: QueryContext) {
    if (!this.createdAt) {
      this.createdAt = new Date().toISOString();
    }

    this.updatedAt = new Date().toISOString();
  }

  override $beforeUpdate(_opt: ModelOptions, _queryContext: QueryContext) {
    this.updatedAt = new Date().toISOString();
  }

  async reload(queryContext: { transaction?: TransactionOrKnex } = {}) {
    const model = await this.$query(queryContext.transaction);
    Object.assign(this, model);
    return this;
  }
}
