import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import type {
  JSONSchema,
  Pojo,
  QueryContext,
  RelationMappings,
  TransactionOrKnex,
} from "objection";

import config from "@/config";

import { generateRandomHexString } from "../services/crypto";
import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { UserLevel, UserLevelJsonSchema } from "../util/user-level";
import { Account } from "./Account";
import { Build } from "./Build";
import { GithubRepository } from "./GithubRepository";
import { GitlabProject } from "./GitlabProject";
import { ProjectUser } from "./ProjectUser";
import { TeamUser } from "./TeamUser";
import type { User } from "./User";

type ProjectPermission = "admin" | "review" | "view_settings" | "view";
export type ProjectAutoIgnore = {
  changes: number;
  period: string;
};

const ALL_PROJECT_PERMISSIONS: ProjectPermission[] = [
  "admin",
  "review",
  "view_settings",
  "view",
];

export class Project extends Model {
  static override tableName = "projects";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
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
          defaultUserLevel: {
            anyOf: [{ type: "null" }, UserLevelJsonSchema as JSONSchema],
          },
          autoIgnore: {
            anyOf: [
              { type: "null" },
              {
                type: "object",
                required: ["changes", "period"],
                properties: {
                  changes: { type: "integer", minimum: 1 },
                  period: { type: "string", minLength: 1 },
                },
              },
            ],
          },
        },
      },
    ],
  };

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
  defaultUserLevel!: UserLevel | null;
  autoIgnore!: ProjectAutoIgnore | null;

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
    this.token = this.token || Project.generateToken();
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

    // If the project is public, the default permissions is "view"
    // else no one can access the project by default.
    const defaultPermissions: ProjectPermission[] = isPublic ? ["view"] : [];

    // If it's an non-authenticated user, we apply the default permissions.
    if (!user) {
      return defaultPermissions;
    }

    // If it's a staff user, they have all permissions.
    if (user.staff) {
      return ALL_PROJECT_PERMISSIONS;
    }

    // If it's a personal project.
    if (project.account.type === "user") {
      // Only the owner can access the project.
      if (project.account.userId === user.id) {
        return ALL_PROJECT_PERMISSIONS;
      }

      // Otherwise, we apply the default permissions.
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

    // If the user is not part of the project or the team, we apply the default permissions.
    if (!teamUser) {
      return defaultPermissions;
    }

    // If the user is part of the team, we apply permissions based on their level.
    switch (teamUser.userLevel) {
      // Owners and members of the team have all permissions.
      case "owner":
      case "member":
        return ALL_PROJECT_PERMISSIONS;

      // If the user is a contributor in the team.
      case "contributor": {
        // If the user has a specific user level defined for the project
        // we use it, else we fallback to the default user level of the project.
        const userLevel = projectUser?.userLevel ?? project.defaultUserLevel;

        // If there is no user level.
        if (!userLevel) {
          // We apply the default permissions.
          return defaultPermissions;
        }

        // Else we apply permissions based on the user level.
        switch (userLevel) {
          case "admin":
            return ALL_PROJECT_PERMISSIONS;
          case "reviewer":
            return ["review", "view_settings", "view"];
          case "viewer":
            return ["view", "view_settings"];
          default:
            assertNever(userLevel);
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

  /**
   * Generate a new token for the project.
   */
  static generateToken() {
    const token = generateRandomHexString(34);
    return `argos_${token}`;
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
