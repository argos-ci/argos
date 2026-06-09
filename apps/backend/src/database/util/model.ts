import type { Knex } from "knex";
import { Model as ObjectionModel } from "objection";
import type {
  ModelOptions,
  Pojo,
  QueryContext,
  TransactionOrKnex,
} from "objection";

import { knex } from "../knex";
import { decrypt, encrypt, encryptDeterministic } from "../services/encrypt";

export class Model extends ObjectionModel {
  id!: string;
  createdAt!: string;
  updatedAt!: string;

  /**
   * Attributes encrypted at rest with a random IV (not queryable by value).
   */
  static encryptedAttributes: string[] = [];

  /**
   * Attributes encrypted at rest deterministically so they remain queryable by
   * equality (the same plaintext always produces the same ciphertext).
   */
  static deterministicEncryptedAttributes: string[] = [];

  override $formatDatabaseJson(json: Pojo): Pojo {
    json = super.$formatDatabaseJson(json);
    const ctor = this.constructor as typeof Model;
    for (const attr of ctor.encryptedAttributes) {
      if (typeof json[attr] === "string") {
        json[attr] = encrypt(json[attr]);
      }
    }
    for (const attr of ctor.deterministicEncryptedAttributes) {
      if (typeof json[attr] === "string") {
        json[attr] = encryptDeterministic(json[attr]);
      }
    }
    return json;
  }

  override $parseDatabaseJson(json: Pojo): Pojo {
    const ctor = this.constructor as typeof Model;
    for (const attr of [
      ...ctor.encryptedAttributes,
      ...ctor.deterministicEncryptedAttributes,
    ]) {
      if (typeof json[attr] === "string") {
        json[attr] = decrypt(json[attr]);
      }
    }
    return super.$parseDatabaseJson(json);
  }

  override $beforeInsert(_queryContext: QueryContext) {
    if (!this.createdAt) {
      this.createdAt = new Date().toISOString();
    }
    if (!this.updatedAt) {
      this.updatedAt = new Date().toISOString();
    }
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

function initObjection(knex: Knex) {
  ObjectionModel.knex(knex);
}

initObjection(knex);
