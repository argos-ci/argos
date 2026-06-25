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

import { generateRandomString } from "../services/crypto";
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

type ProjectPermission =
  | "admin"
  | "review"
  | "review_dismiss"
  | "view_settings"
  | "view";
export type DeploymentAuth = "public" | "domain-private" | "private";

/**
 * Default number of occurrences before a change is considered flaky and
 * automatically ignored.
 */
export const DEFAULT_AUTO_IGNORE_CHANGES = 3;

export type ProjectAutoIgnore = {
  changes: number;
};

/**
 * Configuration of the ignore feature for a project.
 *
 * It only stores values that differ from the default. The default is:
 * - The ignore feature is enabled.
 * - Auto-ignore is enabled with {@link DEFAULT_AUTO_IGNORE_CHANGES} occurrences.
 *
 * - `enabled` absent means the ignore feature is enabled.
 * - `autoIgnore` absent means auto-ignore is enabled with the default threshold.
 * - `autoIgnore` set to `false` means auto-ignore is disabled.
 */
export type ProjectIgnoreConfig = {
  enabled?: boolean;
  autoIgnore?: false | ProjectAutoIgnore;
};

/**
 * Resolved ignore configuration with all defaults applied.
 */
export type ResolvedIgnoreConfig = {
  /** Whether the ignore feature is enabled. */
  enabled: boolean;
  /** Auto-ignore settings, or `null` when auto-ignore is disabled. */
  autoIgnore: ProjectAutoIgnore | null;
};

/**
 * Resolve a stored ignore configuration into its effective values.
 */
export function resolveIgnoreConfig(
  config: ProjectIgnoreConfig | null | undefined,
): ResolvedIgnoreConfig {
  const enabled = config?.enabled !== false;
  if (!enabled) {
    return { enabled: false, autoIgnore: null };
  }
  const autoIgnore = config?.autoIgnore;
  if (autoIgnore === false) {
    return { enabled: true, autoIgnore: null };
  }
  return {
    enabled: true,
    autoIgnore: { changes: autoIgnore?.changes ?? DEFAULT_AUTO_IGNORE_CHANGES },
  };
}

/**
 * Normalize an ignore configuration so that only values differing from the
 * default are stored. Returns `null` when the configuration matches the default.
 */
export function normalizeIgnoreConfig(
  input: ResolvedIgnoreConfig,
): ProjectIgnoreConfig | null {
  if (!input.enabled) {
    return { enabled: false };
  }
  const config: ProjectIgnoreConfig = {};
  if (input.autoIgnore === null) {
    config.autoIgnore = false;
  } else if (input.autoIgnore.changes !== DEFAULT_AUTO_IGNORE_CHANGES) {
    config.autoIgnore = { changes: input.autoIgnore.changes };
  }
  return Object.keys(config).length === 0 ? null : config;
}

const ALL_PROJECT_PERMISSIONS: ProjectPermission[] = [
  "admin",
  "review",
  "review_dismiss",
  "view_settings",
  "view",
];

export class Project extends Model {
  static override tableName = "projects";

  static override deterministicEncryptedAttributes = ["token"];

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
          deploymentProdBranchGlob: { type: ["null", "string"] },
          accountId: { type: "string" },
          githubRepositoryId: { type: ["null", "string"] },
          gitlabProjectId: { type: ["null", "string"] },
          prCommentEnabled: { type: "boolean" },
          githubActionsOidcEnabled: { type: "boolean" },
          tokenlessAuthEnabled: { type: "boolean" },
          deploymentEnabled: { type: "boolean" },
          deploymentAuth: {
            type: "string",
            enum: ["public", "domain-private", "private"],
          },
          summaryCheck: { type: "string", enum: ["always", "never", "auto"] },
          defaultUserLevel: {
            anyOf: [{ type: "null" }, UserLevelJsonSchema as JSONSchema],
          },
          ignoreConfig: {
            anyOf: [
              { type: "null" },
              {
                type: "object",
                properties: {
                  enabled: { type: "boolean" },
                  autoIgnore: {
                    anyOf: [
                      { type: "boolean" },
                      {
                        type: "object",
                        required: ["changes"],
                        properties: {
                          changes: { type: "integer", minimum: 1 },
                        },
                      },
                    ],
                  },
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
  githubActionsOidcEnabled!: boolean;
  tokenlessAuthEnabled!: boolean;
  deploymentEnabled!: boolean;
  deploymentAuth!: DeploymentAuth;
  summaryCheck!: "always" | "never" | "auto";
  defaultUserLevel!: UserLevel | null;
  ignoreConfig!: ProjectIgnoreConfig | null;
  deploymentProdBranchGlob!: string | null;

  /**
   * Resolve the effective ignore configuration of the project.
   */
  $getIgnoreConfig(): ResolvedIgnoreConfig {
    return resolveIgnoreConfig(this.ignoreConfig);
  }

  override $formatDatabaseJson(json: Pojo) {
    json = super.$formatDatabaseJson(json);

    [
      "name",
      "defaultBaseBranch",
      "autoApprovedBranchGlob",
      "deploymentProdBranchGlob",
    ].forEach((value) => {
      if (typeof json[value] === "string") {
        json[value] = json[value].trim() || null;
      }
    });

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
    const token = generateRandomString(34);
    return `argos_${token}`;
  }

  /**
   * Get the default repository branch or fallback to "main".
   */
  async $getDefaultGitRepoBranch() {
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
   * Get the default base branch for the project.
   * It's the branch used by default as base if other strategies are not available.
   * A `defaultBaseBranch` that is null means that the default
   * branch of the repository should be used.
   */
  async $getDefaultBaseBranch() {
    if (this.defaultBaseBranch) {
      return this.defaultBaseBranch;
    }
    return this.$getDefaultGitRepoBranch();
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

  /**
   * Get the production branch glob for the project.
   * All branches that match this will be automatically marked as a production deployment.
   * It falls back to the repo branch if not found.
   */
  async $getDeploymentProductionBranchGlob() {
    if (this.deploymentProdBranchGlob) {
      return this.deploymentProdBranchGlob;
    }
    return this.$getDefaultGitRepoBranch();
  }

  async getUrl() {
    await this.$fetchGraph("account", { skipFetched: true });
    invariant(this.account, "account is not fetched");
    const pathname = `/${this.account.slug}/${this.name}`;
    return `${config.get("server.url")}${pathname}`;
  }
}
