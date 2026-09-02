import { ProjectNameSchema } from "@argos/schemas/project";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import type {
  JSONSchema,
  Pojo,
  QueryContext,
  RelationMappings,
  TransactionOrKnex,
} from "objection";
import { z } from "zod";

import config from "@/config";

import { generateRandomString } from "../services/crypto";
import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { UserLevel, UserLevelJsonSchema } from "../util/user-level";
import { Account } from "./Account";
import { Build } from "./Build";
import { GithubRepository } from "./GithubRepository";
import { GitlabProject } from "./GitlabProject";
import { OriginRepository } from "./OriginRepository";
import { ProjectUser } from "./ProjectUser";
import { TeamUser } from "./TeamUser";
import type { User } from "./User";

export type ProjectPermission =
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
          name: z.toJSONSchema(ProjectNameSchema) as JSONSchema,
          token: { type: "string" },
          private: { type: ["null", "boolean"] },
          defaultBaseBranch: { type: ["null", "string"] },
          autoApprovedBranchGlob: { type: ["null", "string"] },
          deploymentProdBranchGlob: { type: ["null", "string"] },
          accountId: { type: "string" },
          deletedAt: { type: ["string", "null"] },
          githubRepositoryId: { type: ["null", "string"] },
          gitlabProjectId: { type: ["null", "string"] },
          originRepositoryId: { type: ["null", "string"] },
          prCommentEnabled: { type: "boolean" },
          githubActionsOidcEnabled: { type: "boolean" },
          tokenlessAuthEnabled: { type: "boolean" },
          deploymentEnabled: { type: "boolean" },
          deploymentAuth: {
            type: "string",
            enum: ["public", "domain-private", "private"],
          },
          summaryCheck: { type: "string", enum: ["always", "never", "auto"] },
          buildNumber: { type: "integer", minimum: 0 },
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
  /**
   * When the project was soft-deleted, or `null` while it is live. Deleting a
   * project stamps this instead of dropping its rows — see
   * `deleteProject` — so use {@link Project.queryNotDeleted} to look one up.
   */
  deletedAt!: string | null;
  githubRepositoryId!: string | null;
  gitlabProjectId!: string | null;
  originRepositoryId!: string | null;
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
   * Last build number allocated for this project. Incremented atomically by
   * `Build.$allocateNumber`; never decremented, so a deleted build's number is
   * not handed out again.
   */
  buildNumber!: number;

  /**
   * Query the projects that have not been soft-deleted, which is what every
   * surface serving a project to a user, to CI or to a crawler wants.
   *
   * `Project.query()` still reaches deleted rows on purpose: stamping the
   * deletion, hard-deleting an account's projects, and staff tooling all need
   * them.
   */
  static queryNotDeleted(trx?: TransactionOrKnex) {
    return Project.query(trx).whereNull("projects.deletedAt");
  }

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
      originRepository: {
        relation: Model.BelongsToOneRelation,
        modelClass: OriginRepository,
        join: {
          from: "projects.originRepositoryId",
          to: "origin_repositories.id",
        },
      },
    };
  }

  builds?: Build[];
  account?: Account;
  githubRepository?: GithubRepository | null;
  gitlabProject?: GitlabProject | null;
  originRepository?: OriginRepository | null;

  override async $beforeInsert(queryContext: QueryContext) {
    await super.$beforeInsert(queryContext);
    this.token = this.token || Project.generateToken();
  }

  static async getPermissions(
    project: Project,
    user: User | null,
  ): Promise<ProjectPermission[]> {
    // A deleted project grants nothing to anyone, and this is where that is
    // enforced for the whole application. Every surface that reaches a project
    // through one of its own rows — a build, a test, a media, an automation
    // rule, addressed by id or by `{owner}/{project}` — authorizes here rather
    // than through a project lookup, so filtering the lookups cannot reach
    // them. Being the funnel also makes it fail closed: a surface added later
    // is covered without knowing that soft delete exists.
    if (project.deletedAt) {
      return [];
    }

    const [isPublic, membershipPermissions] = await Promise.all([
      project.$checkIsPublic(),
      Project.getMembershipPermissions(project, user),
    ]);
    if (membershipPermissions.length > 0) {
      return membershipPermissions;
    }
    // A public project can at least be viewed by anyone, member or not.
    return isPublic ? ["view"] : [];
  }

  /**
   * The permissions granted by who the viewer is — staff, the owner of a
   * personal project, or team membership (fine-grained contributor access
   * included). Unlike {@link Project.getPermissions}, the project being public
   * grants nothing here: this is the input for anything scoped to "team members
   * only", such as team-visibility media, which must not open up just because
   * the project is a public one anyone may view.
   */
  static async getMembershipPermissions(
    project: Project,
    user: User | null,
  ): Promise<ProjectPermission[]> {
    // Repeated rather than left to the caller: this is a public entry point of
    // its own, and a deleted project has no members either.
    if (project.deletedAt) {
      return [];
    }

    // An anonymous visitor is a member of nothing.
    if (!user) {
      return [];
    }

    // If it's a staff user, they have all permissions.
    if (user.staff) {
      return ALL_PROJECT_PERMISSIONS;
    }

    await project.$fetchGraph("account", { skipFetched: true });
    invariant(project.account);

    // If it's a personal project, only the owner can access the project.
    if (project.account.type === "user") {
      return project.account.userId === user.id ? ALL_PROJECT_PERMISSIONS : [];
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

    // If the user is not part of the team, they are a member of nothing.
    if (!teamUser) {
      return [];
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

        // If there is no user level, the contributor has no access of their own.
        if (!userLevel) {
          return [];
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

  async $getMembershipPermissions(user: User | null) {
    return Project.getMembershipPermissions(this, user);
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

    // Origin repositories are never public.
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
    await this.$fetchGraph(
      "[githubRepository, gitlabProject, originRepository]",
      {
        skipFetched: true,
      },
    );
    if (this.githubRepository) {
      return this.githubRepository.defaultBranch;
    }
    if (this.gitlabProject) {
      return this.gitlabProject.defaultBranch;
    }
    if (this.originRepository) {
      return this.originRepository.defaultBranch;
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
