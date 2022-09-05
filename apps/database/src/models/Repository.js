import crypto from "crypto";
import { promisify } from "util";
import { Model, mergeSchemas, timestampsSchema } from "../util";
import { UserRepositoryRight } from "./UserRepositoryRight";
import { User } from "./User";
import { Build } from "./Build";
import { Organization } from "./Organization";
import { Installation } from "./Installation";

const generateRandomBytes = promisify(crypto.randomBytes);

export class Repository extends Model {
  static get tableName() {
    return "repositories";
  }

  static get jsonSchema() {
    return mergeSchemas(timestampsSchema, {
      required: ["githubId", "name", "enabled", "private", "defaultBranch"],
      properties: {
        githubId: { type: "number" },
        name: { type: "string" },
        enabled: { type: "boolean" },
        token: { type: "string" },
        organizationId: { type: ["string", null] },
        userId: { type: ["string", null] },
        private: { type: "boolean" },
        defaultBranch: { type: ["string", null] },
        useDefaultBranch: { type: "boolean" },
        baselineBranch: { type: ["string", null] },
      },
    });
  }

  static get relationMappings() {
    return {
      builds: {
        relation: Model.HasManyRelation,
        modelClass: Build,
        join: {
          from: "repositories.id",
          to: "builds.repositoryId",
        },
      },
      organization: {
        relation: Model.BelongsToOneRelation,
        modelClass: Organization,
        join: {
          from: "repositories.organizationId",
          to: "organizations.id",
        },
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "repositories.userId",
          to: "users.id",
        },
      },
      installations: {
        relation: Model.ManyToManyRelation,
        modelClass: Installation,
        join: {
          from: "repositories.id",
          through: {
            from: "installation_repository_rights.repositoryId",
            to: "installation_repository_rights.installationId",
          },
          to: "installations.id",
        },
        modify(builder) {
          return builder.where({ deleted: false });
        },
      },
    };
  }

  getUsers(options) {
    return this.constructor.getUsers(this.id, options);
  }

  get referenceBranch() {
    return !this.useDefaultBranch && this.baselineBranch
      ? this.baselineBranch
      : this.defaultBranch;
  }

  async $beforeInsert(queryContext) {
    await super.$beforeInsert(queryContext);
    this.token = this.token || (await Repository.generateToken());
  }

  async $relatedOwner({ trx } = {}) {
    if (this.userId) {
      if (!this.user) {
        this.user = await this.$relatedQuery("user", trx);
      }

      return this.user;
    }

    if (this.organizationId) {
      if (!this.organization) {
        this.organization = await this.$relatedQuery("organization", trx);
      }

      return this.organization;
    }

    return null;
  }

  static getUsers(repositoryId, { trx } = {}) {
    return User.query(trx)
      .select("users.*")
      .join(
        "user_repository_rights",
        "users.id",
        "=",
        "user_repository_rights.userId"
      )
      .join(
        "repositories",
        "user_repository_rights.repositoryId",
        "=",
        "repositories.id"
      )
      .where("repositories.id", repositoryId);
  }

  async $checkWritePermission(user) {
    return Repository.checkWritePermission(this, user);
  }

  async $checkReadPermission(user) {
    return Repository.checkReadPermission(this, user);
  }

  static async checkWritePermission(repository, user) {
    if (!user) return false;
    const userRepositoryRight = await UserRepositoryRight.query()
      .where({ userId: user.id, repositoryId: repository.id })
      .first();
    return Boolean(userRepositoryRight);
  }

  static async checkReadPermission(repository, user) {
    if (!repository.private) return true;
    return Repository.checkWritePermission(repository, user);
  }

  static async generateToken() {
    const token = await generateRandomBytes(20);
    return token.toString("hex");
  }
}
