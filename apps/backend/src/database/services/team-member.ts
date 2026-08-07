/**
 * Team membership: listing members, changing their level, removing them, and
 * the team-wide settings that govern how people join.
 *
 * Shared by the GraphQL API (`Team.members`, `setTeamMemberLevel`,
 * `removeUserFromTeam`, …) and the public REST API
 * (`/accounts/{accountSlug}/members`) so both enforce the exact same
 * authorization and the same rules.
 *
 * Services throw `HTTPError` (via `boom`); the GraphQL layer converts them to
 * GraphQL errors with `toGraphQLError`.
 */
import type { TeamUserLevelSchema } from "@argos/schemas/team-user-level";
import { invariant } from "@argos/util/invariant";
import type { QueryBuilder } from "objection";
import type { z } from "zod";

import { boom } from "@/util/error";

import { Account } from "../models/Account";
import { GithubAccountMember } from "../models/GithubAccountMember";
import { Team } from "../models/Team";
import { TeamUser } from "../models/TeamUser";
import type { User } from "../models/User";
import { transaction } from "../transaction";
import { isValidPgBigInt } from "../util/biginteger";

export type TeamUserLevel = z.infer<typeof TeamUserLevelSchema>;

/** Level applied to members that were not given one explicitly. */
export type TeamDefaultUserLevel = Team["defaultUserLevel"];

/**
 * Assert that `user` administers the team behind `account`, and return the
 * team id. Throws `400` when the account is not a team, `403` when the user is
 * not one of its administrators.
 *
 * This is the single authorization gate for every mutation in this module, so
 * the GraphQL API and the REST API can never drift on who is allowed to manage
 * a team.
 */
export async function assertTeamAdmin(args: {
  account: Account;
  user: User;
}): Promise<string> {
  const { account, user } = args;
  if (account.type !== "team" || !account.teamId) {
    throw boom(400, "This account is not a team.");
  }
  const permissions = await account.$getPermissions(user);
  if (!permissions.includes("admin")) {
    throw boom(403, "You are not an administrator of this team.");
  }
  return account.teamId;
}

/**
 * Load an account by id, for the GraphQL API, which routes on account ids. The
 * REST API resolves the account from the token scope instead.
 *
 * Deliberately does *not* authorize: every mutation below calls
 * {@link assertTeamAdmin} itself, so authorization happens exactly once and
 * cannot be skipped by a caller that forgot it.
 */
export async function loadAccountById(id: string): Promise<Account> {
  if (!isValidPgBigInt(id)) {
    throw boom(400, "Invalid ID.");
  }
  const account = await Account.query().findById(id);
  if (!account) {
    throw boom(404, "Account not found.");
  }
  return account;
}

/** Ordering options for a team member listing. */
export type TeamMembersOrder = "date" | "name-asc" | "name-desc";

export type TeamMemberFilters = {
  /** Match members on their account name, slug, or email. */
  search?: string | null | undefined;
  /** Restrict to the given levels. */
  levels?: TeamUserLevel[] | null | undefined;
  /**
   * Restrict to members that are part of the GitHub SSO (`true`) or not
   * (`false`). Ignored when the team has no GitHub SSO configured.
   */
  sso?: boolean | null | undefined;
  orderBy?: TeamMembersOrder | undefined;
};

/**
 * Build the query listing a team's members, with the joined user account so
 * callers can serialize them. Callers apply their own pagination (`range`).
 *
 * Takes the loaded `Team` rather than an id so the GraphQL resolver can pass
 * the one it already has from its DataLoader.
 */
export function queryTeamMembers(args: {
  team: Team;
  filters?: TeamMemberFilters;
}): QueryBuilder<TeamUser, TeamUser[]> {
  const { team, filters = {} } = args;
  const { search, levels, sso, orderBy = "date" } = filters;

  const query = TeamUser.query()
    .withGraphJoined("user.account")
    .where("team_users.teamId", team.id);

  switch (orderBy) {
    case "date":
      query.orderBy("team_users.id", "DESC");
      break;
    case "name-asc":
      query
        .orderBy("user:account.name", "ASC")
        .orderBy("user:account.slug", "ASC");
      break;
    case "name-desc":
      query
        .orderBy("user:account.name", "DESC")
        .orderBy("user:account.slug", "DESC");
      break;
  }

  if (levels && levels.length > 0) {
    query.whereIn("team_users.userLevel", levels);
  }

  if (search) {
    query.where((qb) => {
      qb.where("user:account.name", "ilike", `%${search}%`)
        .orWhere("user:account.slug", "ilike", `%${search}%`)
        .orWhere("user.email", "ilike", `%${search}%`);
    });
  }

  // Filtering on SSO membership is only meaningful when SSO is configured.
  const ssoGithubAccountId = team.ssoGithubAccountId;
  if (ssoGithubAccountId && typeof sso === "boolean") {
    const ssoMemberIds = GithubAccountMember.query()
      .select("githubMemberId")
      .where("githubAccountId", ssoGithubAccountId);
    if (sso) {
      query.whereIn("user:account.githubAccountId", ssoMemberIds);
    } else {
      query.where((qb) => {
        qb.whereNull("user:account.githubAccountId").orWhereNotIn(
          "user:account.githubAccountId",
          ssoMemberIds,
        );
      });
    }
  }

  return query;
}

/**
 * Resolve the team membership of the account identified by `userAccountId`,
 * or throw `404`. Used by the mutations below, which all address a member by
 * their *account* id (the public identifier) rather than their user id.
 */
async function getTeamUserByAccountId(args: {
  teamId: string;
  userAccountId: string;
}): Promise<TeamUser> {
  const { teamId, userAccountId } = args;
  if (!isValidPgBigInt(userAccountId)) {
    throw boom(400, "Invalid user account ID.");
  }
  const userAccount = await Account.query().findById(userAccountId);
  if (!userAccount?.userId) {
    throw boom(404, "User not found.");
  }
  const teamUser = await TeamUser.query().findOne({
    teamId,
    userId: userAccount.userId,
  });
  if (!teamUser) {
    throw boom(404, "This user is not a member of the team.");
  }
  return teamUser;
}

/**
 * Set a member's level on a team. No-op when the member already holds it.
 */
export async function setTeamMemberLevel(args: {
  account: Account;
  user: User;
  userAccountId: string;
  level: TeamUserLevel;
}): Promise<TeamUser> {
  const teamId = await assertTeamAdmin(args);
  const teamUser = await getTeamUserByAccountId({
    teamId,
    userAccountId: args.userAccountId,
  });

  if (teamUser.userLevel === args.level) {
    return teamUser;
  }

  return teamUser.$query().patchAndFetch({ userLevel: args.level });
}

/**
 * Remove a member from a team.
 *
 * A team must always keep at least one member, and at least one owner: removing
 * the second-to-last member promotes the remaining one to owner, so a team can
 * never end up with members but nobody able to administer it.
 */
export async function removeTeamMember(args: {
  account: Account;
  user: User;
  userAccountId: string;
}): Promise<{ teamMemberId: string }> {
  const teamId = await assertTeamAdmin(args);
  const teamUser = await getTeamUserByAccountId({
    teamId,
    userAccountId: args.userAccountId,
  });

  const count = await TeamUser.query().where({ teamId }).resultSize();
  if (count === 1) {
    throw boom(403, "Can't remove the last user of a team.");
  }

  await transaction(async (trx) => {
    await TeamUser.query(trx).findById(teamUser.id).delete();

    // The last one left is the only one, so it must be the owner.
    if (count === 2) {
      await TeamUser.query(trx).where({ teamId }).patch({ userLevel: "owner" });
    }
  });

  return { teamMemberId: teamUser.id };
}

/**
 * Set the level given to members that join a team without an explicit one
 * (through the invite link or a verified email domain).
 */
export async function setTeamDefaultUserLevel(args: {
  account: Account;
  user: User;
  level: TeamDefaultUserLevel;
}): Promise<Account> {
  const teamId = await assertTeamAdmin(args);
  await Team.query().findById(teamId).patch({ defaultUserLevel: args.level });
  return args.account;
}

/**
 * Rotate a team's invite link, invalidating the previous one. Returns the new
 * link so callers can hand it straight back.
 */
export async function resetTeamInviteLink(args: {
  account: Account;
  user: User;
}): Promise<string> {
  const teamId = await assertTeamAdmin(args);
  const team = await Team.query().findById(teamId);
  invariant(team, "team not found");
  // `$query().patch` writes the new secret back onto the instance, so
  // `$getInviteLink` builds the link from it without another read.
  await team.$query().patch({ inviteSecret: Team.generateInviteSecret() });
  return team.$getInviteLink();
}
