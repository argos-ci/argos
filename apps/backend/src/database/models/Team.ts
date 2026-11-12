import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import type { RelationMappings } from "objection";

import { checkAuthSatisfiesTeamSaml, type AuthViewer } from "@/auth/payload";
import { checkTeamSamlEnforced } from "@/auth/saml";
import config from "@/config";
import { boom } from "@/util/error";

import { generateRandomString } from "../services/crypto";
import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Account, AccountPermission, ALL_ACCOUNT_PERMISSIONS } from "./Account";
import { GithubAccount } from "./GithubAccount";
import { TeamUser } from "./TeamUser";
import { User } from "./User";

/**
 * How a request reaches a team. A member is kept out like an outsider while
 * the team enforces SAML and the request did not go through its IdP;
 * `saml_required` lets the entry points tell them so.
 */
export type TeamAccess =
  | { type: "member"; userLevel: TeamUser["userLevel"] }
  | { type: "outsider" }
  | { type: "saml_required" };

export class Team extends Model {
  static override tableName = "teams";

  static override deterministicEncryptedAttributes = ["inviteSecret"];

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["defaultUserLevel"],
        properties: {
          inviteSecret: { type: ["null", "string"] },
          ssoGithubAccountId: { type: ["null", "string"] },
          samlPurchased: { type: "boolean" },
          staticIpEnabled: { type: "boolean" },
          defaultUserLevel: { type: "string", enum: ["member", "contributor"] },
        },
      },
    ],
  };

  inviteSecret!: string | null;
  ssoGithubAccountId!: string | null;
  samlPurchased!: boolean;
  /**
   * Whether Argos reaches GitHub from its static IP addresses for the
   * installations this team's projects use.
   */
  staticIpEnabled!: boolean;
  defaultUserLevel!: "member" | "contributor";

  static override get relationMappings(): RelationMappings {
    return {
      account: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: "teams.id",
          to: "accounts.teamId",
        },
      },
      owners: {
        relation: Model.ManyToManyRelation,
        modelClass: User,
        join: {
          from: "teams.id",
          through: {
            from: "team_users.teamId",
            to: "team_users.userId",
          },
          to: "users.id",
        },
        filter: (query) => query.where({ "team_users.userLevel": "owner" }),
      },
      teamUsers: {
        relation: Model.HasManyRelation,
        modelClass: TeamUser,
        join: {
          from: "teams.id",
          to: "team_users.teamId",
        },
      },
      users: {
        relation: Model.ManyToManyRelation,
        modelClass: User,
        join: {
          from: "teams.id",
          through: {
            from: "team_users.teamId",
            to: "team_users.userId",
          },
          to: "users.id",
        },
      },
      ssoGithubAccount: {
        relation: Model.HasOneRelation,
        modelClass: GithubAccount,
        join: {
          from: "teams.ssoGithubAccountId",
          to: "github_accounts.id",
        },
      },
    };
  }

  account?: Account;
  users?: User[];
  owners?: User[];
  ssoGithubAccount?: GithubAccount | null;

  /**
   * Generate the invite secret.
   */
  static generateInviteSecret() {
    return generateRandomString(20);
  }

  /**
   * Generate an invite link for the team.
   */
  async $getInviteLink() {
    if (!this.inviteSecret) {
      this.inviteSecret = Team.generateInviteSecret();
      await Team.query()
        .findById(this.id)
        .patch({ inviteSecret: this.inviteSecret });
    }
    return new URL(
      `/teams/invite/${this.inviteSecret}`,
      config.get("server.url"),
    ).href;
  }

  /**
   * How `auth` reaches the team. Every permission on a team or its projects
   * derives from this, which is what makes SAML enforcement hold everywhere.
   */
  static async getAccess(
    teamId: string,
    auth: AuthViewer,
  ): Promise<TeamAccess> {
    const teamUser = await TeamUser.query()
      .select(
        "team_users.userLevel",
        "team_saml_configs.enforced",
        "team_saml_configs.enabled",
      )
      .join("accounts", "accounts.teamId", "team_users.teamId")
      .leftJoin(
        "team_saml_configs",
        "team_saml_configs.accountId",
        "accounts.id",
      )
      .where("team_users.teamId", teamId)
      .where("team_users.userId", auth.user.id)
      .first()
      .castTo<
        | {
            userLevel: TeamUser["userLevel"];
            enforced: boolean | null;
            enabled: boolean | null;
          }
        | undefined
      >();

    if (!teamUser) {
      return { type: "outsider" };
    }

    if (
      teamUser.enforced &&
      teamUser.enabled &&
      !checkAuthSatisfiesTeamSaml(auth, teamId)
    ) {
      const account = await Account.query()
        .findOne({ "accounts.teamId": teamId })
        .withGraphJoined("teamSamlConfig");
      invariant(account, "Team account not found");
      if (await checkTeamSamlEnforced(account)) {
        return { type: "saml_required" };
      }
    }

    return { type: "member", userLevel: teamUser.userLevel };
  }

  /**
   * Throw `SAML_SSO_REQUIRED` when `auth` is a member kept out of the team by
   * its SAML enforcement. For entry points that found nothing to show, so
   * the member is prompted to sign in instead of being told it does not exist.
   */
  static async assertSamlSatisfied(
    teamId: string | null,
    auth: AuthViewer | null,
  ): Promise<void> {
    if (!teamId || !auth) {
      return;
    }
    const access = await Team.getAccess(teamId, auth);
    if (access.type === "saml_required") {
      throw boom(403, "SAML Single Sign-On required", {
        code: "SAML_SSO_REQUIRED",
      });
    }
  }

  /**
   * Get permissions for a request in a team.
   */
  static async getPermissions(
    teamId: string,
    auth: AuthViewer | null,
  ): Promise<AccountPermission[]> {
    if (!auth) {
      return [];
    }

    if (auth.user.staff) {
      return ALL_ACCOUNT_PERMISSIONS;
    }

    const access = await Team.getAccess(teamId, auth);
    if (access.type !== "member") {
      return [];
    }

    switch (access.userLevel) {
      case "owner":
        return ALL_ACCOUNT_PERMISSIONS;
      case "member":
      case "contributor":
        return ["view"];
      default:
        assertNever(access.userLevel);
    }
  }

  /**
   * Get the user IDs of the owners of a team.
   */
  static async getOwnerIds(teamId: string): Promise<string[]> {
    const teamUsers = await TeamUser.query()
      .select("userId")
      .where({ teamId, userLevel: "owner" });
    return teamUsers.map((teamUser) => teamUser.userId);
  }
}
