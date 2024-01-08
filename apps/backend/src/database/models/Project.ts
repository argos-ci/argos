import type {
  Pojo,
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
import { GitlabProject } from "./GitlabProject.js";
import config from "@/config/index.js";

export class Project extends Model {
  static override tableName = "projects";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["name", "accountId"],
    properties: {
      name: {
        type: "string",
        minLength: 1,
        maxLength: 100,
        pattern: "^[a-zA-Z0-9_\\-.]+$",
      },
      token: { type: "string" },
      private: { type: ["null", "boolean"] },
      baselineBranch: { type: ["null", "string"] },
      accountId: { type: "string" },
      githubRepositoryId: { type: ["null", "string"] },
      gitlabProjectId: { type: ["null", "string"] },
      vercelProjectId: { type: ["null", "string"] },
      prCommentEnabled: { type: "boolean" },
      summaryCheck: { type: "string", enum: ["always", "never", "auto"] },
    },
  });

  name!: string;
  token!: string;
  private!: boolean | null;
  baselineBranch!: string | null;
  accountId!: string;
  githubRepositoryId!: string | null;
  gitlabProjectId!: string | null;
  vercelProjectId!: string | null;
  prCommentEnabled!: boolean;
  summaryCheck!: "always" | "never" | "auto";

  override $formatDatabaseJson(json: Pojo) {
    json = super.$formatDatabaseJson(json);
    if (json["name"]) {
      json["name"] = json["name"].trim();
    }
    if (json["baselineBranch"]) {
      json["baselineBranch"] = json["baselineBranch"].trim();
    }
    return json;
  }

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
      gitlabProject: {
        relation: Model.BelongsToOneRelation,
        modelClass: GitlabProject,
        join: {
          from: "projects.gitlabProjectId",
          to: "gitlab_projects.id",
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
  gitlabProject?: GitlabProject | null;
  vercelProject?: VercelProject | null;

  override async $beforeInsert(queryContext: QueryContext) {
    await super.$beforeInsert(queryContext);
    this.token = this.token || (await Project.generateToken());
  }

  static async checkWritePermission(project: Project, user: User | null) {
    if (!user) return false;
    const account = project.account ?? (await project.$relatedQuery("account"));
    return account.$checkReadPermission(user);
  }

  static async checkReadPermission(project: Project, user: User | null) {
    const isPublic = await project.$checkIsPublic();
    if (isPublic) return true;
    return Project.checkWritePermission(project, user);
  }

  async $checkIsPublic(trx?: TransactionOrKnex) {
    if (this.private === false) return true;
    if (this.private === true) return false;

    await this.$fetchGraph(
      "[githubRepository, gitlabProject]",
      trx ? { transaction: trx, skipFetched: true } : undefined,
    );

    if (this.githubRepository) {
      return !this.githubRepository.private;
    }
    if (this.gitlabProject) {
      return !this.gitlabProject.private;
    }
    return false;
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
    await this.$fetchGraph(
      "[githubRepository, gitlabProject]",
      trx ? { transaction: trx, skipFetched: true } : undefined,
    );
    if (this.githubRepository) {
      return this.githubRepository.defaultBranch;
    }
    if (this.gitlabProject) {
      return this.gitlabProject.defaultBranch;
    }
    return "main";
  }

  async getUrl() {
    if (!this.account) {
      throw new Error("Account not found");
    }

    const pathname = `/${this.account.slug}/${this.name}`;
    return `${config.get("server.url")}${pathname}`;
  }
}
