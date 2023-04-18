import { randomBytes } from "node:crypto";
import { promisify } from "node:util";
import type {
  QueryContext,
  RelationMappings,
  TransactionOrKnex,
} from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Build } from "./Build.js";
import { Installation } from "./Installation.js";
import { Organization } from "./Organization.js";
import { User } from "./User.js";
import { UserRepositoryRight } from "./UserRepositoryRight.js";

const generateRandomBytes = promisify(randomBytes);

export class Repository extends Model {
  static override tableName = "repositories";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["githubId", "name", "private", "defaultBranch"],
    properties: {
      githubId: { type: "number" },
      name: { type: "string" },
      token: { type: "string" },
      organizationId: { type: ["string", "null"] },
      userId: { type: ["string", "null"] },
      private: { type: "boolean" },
      forcedPrivate: { type: "boolean" },
      defaultBranch: { type: "string" },
      baselineBranch: { type: ["string", "null"] },
    },
  });

  githubId!: number;
  name!: string;
  token!: string;
  organizationId!: string | null;
  userId!: string | null;
  private!: boolean;
  forcedPrivate!: boolean;
  defaultBranch!: string;
  baselineBranch!: string | null;

  static override virtualAttributes = ["referenceBranch"];

  get referenceBranch() {
    return this.baselineBranch || this.defaultBranch;
  }

  static override get relationMappings(): RelationMappings {
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
      activeInstallation: {
        relation: Model.HasOneThroughRelation,
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
          return builder.findOne({ deleted: false });
        },
      },
      users: {
        relation: Model.ManyToManyRelation,
        modelClass: User,
        join: {
          from: "repositories.id",
          through: {
            from: "user_repository_rights.repositoryId",
            to: "user_repository_rights.userId",
          },
          to: "users.id",
        },
      },
    };
  }

  builds?: Build[];
  organization?: Organization;
  user?: User;
  installations?: Installation[];
  activeInstallation?: Installation | null;

  override async $beforeInsert(queryContext: QueryContext) {
    await super.$beforeInsert(queryContext);
    this.token = this.token || (await Repository.generateToken());
  }

  static getUsers(
    repositoryId: string,
    { trx }: { trx?: TransactionOrKnex | undefined } = {}
  ) {
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

  static async checkWritePermission(repository: Repository, user: User | null) {
    if (!user) return false;
    const userRepositoryRight = await UserRepositoryRight.query()
      .where({ userId: user.id, repositoryId: repository.id })
      .first();
    return Boolean(userRepositoryRight);
  }

  static async checkReadPermission(repository: Repository, user: User | null) {
    if (!repository.private && !repository.forcedPrivate) return true;
    return Repository.checkWritePermission(repository, user);
  }

  static async generateToken() {
    const token = await generateRandomBytes(20);
    return token.toString("hex");
  }

  async $checkWritePermission(user: User | null) {
    return Repository.checkWritePermission(this, user);
  }

  async $checkReadPermission(user: User | null) {
    return Repository.checkReadPermission(this, user);
  }

  getUsers(options?: { trx?: TransactionOrKnex | undefined }) {
    return Repository.getUsers(this.id, options);
  }

  async $relatedOwner({ trx }: { trx?: TransactionOrKnex | undefined } = {}) {
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
}
