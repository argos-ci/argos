import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import type {
  Pojo,
  QueryContext,
  RelationMappings,
  TransactionOrKnex,
} from "objection";

import config from "@/config/index.js";

import { generateRandomHexString } from "../services/crypto.js";
import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Account } from "./Account.js";
import { Build } from "./Build.js";
import { GithubRepository } from "./GithubRepository.js";
import { GitlabProject } from "./GitlabProject.js";
import { ProjectUser } from "./ProjectUser.js";
import { TeamUser } from "./TeamUser.js";
import type { User } from "./User.js";

type ProjectPermission = "admin" | "review" | "view_settings" | "view";

const ALL_PROJECT_PERMISSIONS: ProjectPermission[] = [
  "admin",
  "review",
  "view_settings",
  "view",
];

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
      defaultBaseBranch: { type: ["null", "string"] },
      autoApprovedBranchGlob: { type: ["null", "string"] },
      accountId: { type: "string" },
      githubRepositoryId: { type: ["null", "string"] },
      gitlabProjectId: { type: ["null", "string"] },
      prCommentEnabled: { type: "boolean" },
      summaryCheck: { type: "string", enum: ["always", "never", "auto"] },
      slackChannelId: { type: ["null", "string"] },
    },
  });

  name!: string;
  token!: string;
  private!: boolean | null;
  defaultBaseBranch!: string | null;
  autoApprovedBranchGlob!: string | null;
  accountId!: string;
  githubRepositoryId!: string | null;
  gitlabProjectId!: string | null;
  prCommentEnabled!: boolean;
  summaryCheck!: "always" | "never" | "auto";
  slackChannelId!: string | null;

  override $formatDatabaseJson(json: Pojo) {
    json = super.$formatDatabaseJson(json);
    if (json["name"]) {
      json["name"] = json["name"].trim();
    }

    if (json["defaultBaseBranch"]) {
      json["defaultBaseBranch"] = json["defaultBaseBranch"].trim();
    }

    if (json["autoApprovedBranchGlob"]) {
      json["autoApprovedBranchGlob"] = json["autoApprovedBranchGlob"].trim();
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
    };
  }

  builds?: Build[];
  account?: Account;
  githubRepository?: GithubRepository | null;
  gitlabProject?: GitlabProject | null;

  override async $beforeInsert(queryContext: QueryContext) {
    await super.$beforeInsert(queryContext);
    this.token = this.token || (await Project.generateToken());
  }

  static async getPermissions(
    project: Project,
    user: User | null,
  ): Promise<ProjectPermission[]> {
    const [isPublic] = await Promise.all([
      project.$checkIsPublic(),
      project.$fetchGraph("account", { skipFetched: true }),
    ]);
    invariant(project.account);

    const defaultPermissions: ProjectPermission[] = isPublic ? ["view"] : [];

    if (!user) {
      return defaultPermissions;
    }

    if (user.staff) {
      return ALL_PROJECT_PERMISSIONS;
    }

    if (project.account.type === "user") {
      if (project.account.userId === user.id) {
        return ALL_PROJECT_PERMISSIONS;
      }
      return defaultPermissions;
    }

    const [projectUser, teamUser] = await Promise.all([
      ProjectUser.query()
        .select("userLevel")
        .findOne({ projectId: project.id, userId: user.id }),
      TeamUser.query().select("userLevel").findOne({
        teamId: project.account.teamId,
        userId: user.id,
      }),
    ]);

    if (!teamUser) {
      return defaultPermissions;
    }

    switch (teamUser.userLevel) {
      case "owner":
      case "member":
        return ALL_PROJECT_PERMISSIONS;
      case "contributor": {
        if (!projectUser) {
          return defaultPermissions;
        }
        switch (projectUser.userLevel) {
          case "admin":
            return ALL_PROJECT_PERMISSIONS;
          case "reviewer":
            return ["review", "view_settings", "view"];
          case "viewer":
            return ["view", "view_settings"];
          default:
            assertNever(projectUser.userLevel);
        }
      }
      // eslint-disable-next-line no-fallthrough
      default:
        assertNever(teamUser.userLevel);
    }
  }

  async $getPermissions(user: User | null) {
    return Project.getPermissions(this, user);
  }

  async $checkIsPublic(trx?: TransactionOrKnex) {
    if (this.private !== null) {
      return !this.private;
    }

    await this.$fetchGraph(
      "[githubRepository, gitlabProject]",
      trx ? { transaction: trx, skipFetched: true } : { skipFetched: true },
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

  /**
   * Get the default base branch for the project.
   * It's the branch used by default as base if other strategies are not available.
   * A `defaultBaseBranch` that is null means that the default
   * branch of the repository should be used.
   */
  async $getDefaultBaseBranch() {
    if (this.defaultBaseBranch) {
      return this.defaultBaseBranch;
    }
    await this.$fetchGraph("[githubRepository, gitlabProject]", {
      skipFetched: true,
    });
    if (this.githubRepository) {
      return this.githubRepository.defaultBranch;
    }
    if (this.gitlabProject) {
      return this.gitlabProject.defaultBranch;
    }
    return "main";
  }

  /**
   * Get the auto-approved branch glob for the project.
   * All branches that match this will be considered as auto-approved branches.
   * A `autoApprovedBranchGlob` that is null means that the default
   * branch of the repository should be used.
   */
  async $getAutoApprovedBranchGlob() {
    if (this.autoApprovedBranchGlob) {
      return this.autoApprovedBranchGlob;
    }
    return this.$getDefaultBaseBranch();
  }

  async getUrl() {
    await this.$fetchGraph("account", { skipFetched: true });
    invariant(this.account, "account is not fetched");
    const pathname = `/${this.account.slug}/${this.name}`;
    return `${config.get("server.url")}${pathname}`;
  }
}
