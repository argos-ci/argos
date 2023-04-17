import type {
  QueryContext,
  RelationMappings,
  TransactionOrKnex,
} from "objection";

import { generateRandomHexString } from "../services/crypto.js";
import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Account } from "./Account.js";
import { Build } from "./Build.js";
import { GithubRepository } from "./GithubRepository.js";
import type { User } from "./User.js";
import { VercelProject } from "./VercelProject.js";

export class Project extends Model {
  static override tableName = "projects";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["name", "accountId"],
    properties: {
      name: { type: "string" },
      token: { type: "string" },
      private: { type: ["null", "boolean"] },
      baselineBranch: { type: ["null", "string"] },
      accountId: { type: "string" },
      githubRepositoryId: { type: ["null", "string"] },
      vercelProjectId: { type: ["null", "string"] },
    },
  });

  name!: string;
  token!: string;
  private!: boolean | null;
  baselineBranch!: string | null;
  accountId!: string;
  githubRepositoryId!: string | null;
  vercelProjectId!: string | null;

  static override get relationMappings(): RelationMappings {
    return {
      builds: {
        relation: Model.HasManyRelation,
        modelClass: Build,
        join: {
          from: "projects.id",
          to: "builds.projectId",
        },
      },
      account: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: "projects.accountId",
          to: "accounts.id",
        },
      },
      githubRepository: {
        relation: Model.BelongsToOneRelation,
        modelClass: GithubRepository,
        join: {
          from: "projects.githubRepositoryId",
          to: "github_repositories.id",
        },
      },
      vercelProject: {
        relation: Model.BelongsToOneRelation,
        modelClass: VercelProject,
        join: {
          from: "projects.vercelProjectId",
          to: "vercel_projects.id",
        },
      },
    };
  }

  builds?: Build[];
  account?: Account;
  githubRepository?: GithubRepository | null;
  vercelProject?: VercelProject | null;

  override async $beforeInsert(queryContext: QueryContext) {
    await super.$beforeInsert(queryContext);
    this.token = this.token || (await Project.generateToken());
  }

  static async checkWritePermission(project: Project, user: User | null) {
    if (!user) return false;
    const account = project.account ?? (await project.$relatedQuery("account"));
    return account.$checkWritePermission(user);
  }

  static async checkReadPermission(project: Project, user: User | null) {
    const isPublic = await project.$checkIsPublic();
    if (isPublic) return true;
    return Project.checkWritePermission(project, user);
  }

  async $checkIsPublic(trx?: TransactionOrKnex) {
    if (this.private === false) return true;
    if (this.private === true) return false;
    const repository =
      this.githubRepository ??
      (await this.$relatedQuery("githubRepository", trx));
    if (!repository) return false;
    return !repository.private;
  }

  static async generateToken() {
    return generateRandomHexString();
  }

  async $checkWritePermission(user: User | null) {
    return Project.checkWritePermission(this, user);
  }

  async $checkReadPermission(user: User | null) {
    return Project.checkReadPermission(this, user);
  }

  async $getReferenceBranch(trx?: TransactionOrKnex) {
    if (this.baselineBranch) return this.baselineBranch;
    const ghRepo =
      this.githubRepository ||
      (await this.$relatedQuery("githubRepository", trx));
    if (!ghRepo) return null;
    return ghRepo.defaultBranch;
  }
}
