import { AccountNameSchema } from "@argos/schemas/account";
import { invariant } from "@argos/util/invariant";
import { captureException } from "@sentry/node";
import type { TransactionOrKnex } from "objection";

import { checkHasAccessToSAML } from "@/auth/saml";
import { isUniqueViolationError } from "@/database/error";
import {
  TeamScimToken,
  TeamScimUser,
  TeamUser,
  UserEmail,
  type Account,
  type Team,
  type User,
} from "@/database/models";
import { createAccount } from "@/database/services/account";
import { hashToken } from "@/database/services/crypto";
import {
  assertTeamAdmin,
  changeTeamMembershipLevel,
  deleteTeamMembership,
  type TeamUserLevel,
} from "@/database/services/team-member";
import { transaction } from "@/database/transaction";
import { isValidPgBigInt } from "@/database/util/biginteger";
import { formatDiscordLink, getAccountUrl, notifyDiscord } from "@/discord";
import {
  checkIsValidEmail,
  getSlugFromEmail,
  sanitizeEmail,
} from "@/util/email";
import { boom } from "@/util/error";

import { invalidValue, ScimError } from "./error";
import type { ScimUserFilter } from "./filter";
import { formatName, getUserAttributes, type ScimUserAttributes } from "./user";

const SAML_REQUIRED_MESSAGE =
  "SCIM provisioning is part of SAML SSO, which is not included in your plan. Enable the SAML SSO add-on to use it.";

/**
 * Generate a team's SCIM token, replacing the current one. Returns the token,
 * which is only stored hashed.
 */
export async function generateTeamScimToken(args: {
  account: Account;
  user: User;
}): Promise<string> {
  const teamId = await assertTeamAdmin(args);
  if (!(await checkHasAccessToSAML(args.account))) {
    throw boom(403, SAML_REQUIRED_MESSAGE);
  }
  const token = TeamScimToken.generateToken();
  await TeamScimToken.query()
    .insert({ teamId, tokenHash: hashToken(token), lastUsedAt: null })
    .onConflict("teamId")
    .merge(["tokenHash", "lastUsedAt", "createdAt", "updatedAt"]);
  return token;
}

export async function revokeTeamScimToken(args: {
  account: Account;
  user: User;
}): Promise<void> {
  const teamId = await assertTeamAdmin(args);
  await TeamScimToken.query().where({ teamId }).delete();
}

/**
 * Find a SCIM token, with the team it provisions.
 */
export async function findScimToken(
  token: string,
): Promise<TeamScimToken | undefined> {
  if (!TeamScimToken.isScimToken(token)) {
    return undefined;
  }
  return TeamScimToken.query()
    .withGraphJoined("team.account")
    .findOne("team_scim_tokens.tokenHash", hashToken(token));
}

/**
 * Check that the team of a SCIM token may still provision — the token outlives
 * a plan downgrade — and record that the token is in use.
 */
export async function authorizeScimToken(
  scimToken: TeamScimToken,
): Promise<Team> {
  const { team } = scimToken;
  invariant(team?.account, "team.account not fetched");
  const [hasAccess] = await Promise.all([
    // `checkHasAccessToSAML` reads `samlPurchased` again, after the plan.
    team.samlPurchased || checkHasAccessToSAML(team.account),
    touchScimToken(scimToken),
  ]);
  if (!hasAccess) {
    throw new ScimError(403, SAML_REQUIRED_MESSAGE);
  }
  return team;
}

const LAST_USED_AT_PRECISION_MS = 60 * 1000;

/**
 * An initial sync sends several requests per user; one write a minute is
 * enough to tell the token is in use.
 */
async function touchScimToken(scimToken: TeamScimToken) {
  const now = Date.now();
  if (
    scimToken.lastUsedAt &&
    now - new Date(scimToken.lastUsedAt).getTime() < LAST_USED_AT_PRECISION_MS
  ) {
    return;
  }
  await TeamScimToken.query()
    .findById(scimToken.id)
    .patch({ lastUsedAt: new Date(now).toISOString() });
}

export async function listScimUsers(args: {
  teamId: string;
  filter: ScimUserFilter | null;
  startIndex: number;
  count: number;
}): Promise<{ totalResults: number; users: TeamScimUser[] }> {
  const { filter, startIndex, count } = args;
  const query = TeamScimUser.query().where("teamId", args.teamId).orderBy("id");
  if (filter) {
    switch (filter.attribute) {
      case "id":
        if (isValidPgBigInt(filter.value)) {
          query.where("id", filter.value);
        } else {
          query.whereRaw("false");
        }
        break;
      case "userName":
      case "email":
        query.whereRaw("lower(??) = lower(?)", [
          filter.attribute,
          filter.value,
        ]);
        break;
      case "externalId":
        query.where("externalId", filter.value);
        break;
    }
  }
  const { results, total } = await query.range(
    startIndex - 1,
    startIndex + count - 2,
  );
  return { totalResults: total, users: results };
}

/**
 * Find a provisioned user of the team, locked when read in a transaction.
 */
export async function getScimUser(args: {
  teamId: string;
  id: string;
  trx?: TransactionOrKnex;
}): Promise<TeamScimUser> {
  const query = TeamScimUser.query(args.trx).findOne({
    teamId: args.teamId,
    id: args.id,
  });
  const scimUser = isValidPgBigInt(args.id)
    ? await (args.trx ? query.forUpdate() : query)
    : undefined;
  if (!scimUser) {
    throw new ScimError(404, `User ${args.id} not found.`);
  }
  return scimUser;
}

function duplicateError() {
  return new ScimError(
    409,
    "A user with the same userName or email already exists.",
    "uniqueness",
  );
}

/**
 * The userName is unique in a team, and so is the person behind the email.
 * Two requests provisioning the same new email at once also collide, on the
 * account the first one creates.
 */
async function rejectDuplicate<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (isUniqueViolationError(error)) {
      throw duplicateError();
    }
    throw error;
  }
}

/**
 * Provision a user: link the Argos user that owns its email, or create one,
 * and make them a member of the team when the user is active — at their role
 * when the IdP sends one, else at the team's default level.
 */
export async function createScimUser(args: {
  team: Team;
  attributes: ScimUserAttributes;
}): Promise<TeamScimUser> {
  const { team, attributes } = args;
  const email = attributes.email ?? attributes.userName;
  if (!checkIsValidEmail(email)) {
    throw invalidValue(
      "The user needs a valid email, sent in emails or as the userName.",
    );
  }

  // Checked before linking the email, which may create an account; the insert
  // below still catches a concurrent request.
  const existing = await TeamScimUser.query()
    .select("id")
    .where("teamId", team.id)
    .whereRaw(`lower("userName") = lower(?)`, [attributes.userName])
    .first();
  if (existing) {
    throw duplicateError();
  }

  return rejectDuplicate(async () => {
    const userId = await getOrCreateUserId({
      email: sanitizeEmail(email),
      name: attributes.displayName ?? formatName(attributes),
    });
    return transaction(async (trx) => {
      const scimUser = await TeamScimUser.query(trx)
        .insert({ teamId: team.id, userId, ...attributes })
        .returning("*");
      if (attributes.active) {
        await addMembership({ team, userId, role: attributes.role, trx });
      }
      return scimUser;
    });
  });
}

/**
 * Update a provisioned user from its current attributes, and follow changes on
 * the team membership: deactivating removes the member, reactivating adds them
 * back, and a new role changes their level. A role the IdP stops sending
 * leaves the level as it is.
 */
export async function updateScimUser(args: {
  team: Team;
  id: string;
  update: (current: ScimUserAttributes) => ScimUserAttributes;
}): Promise<TeamScimUser> {
  const { team } = args;
  const { updated, leftWithoutOwner } = await rejectDuplicate(() =>
    transaction(async (trx) => {
      const scimUser = await getScimUser({ teamId: team.id, id: args.id, trx });
      const { userId, active: wasActive, role: previousRole } = scimUser;
      const attributes = args.update(getUserAttributes(scimUser));
      const [updated] = await TeamScimUser.query(trx)
        .patch(attributes)
        .where("id", scimUser.id)
        .returning("*");
      invariant(updated, "Patched user not returned");
      let leftWithoutOwner = false;
      if (!attributes.active) {
        if (wasActive) {
          leftWithoutOwner = await removeMembership({ team, userId, trx });
        }
      } else if (!wasActive) {
        await addMembership({ team, userId, role: attributes.role, trx });
      } else if (attributes.role && attributes.role !== previousRole) {
        await changeTeamMembershipLevel({
          teamId: team.id,
          userId,
          level: attributes.role,
          trx,
        });
      }
      return { updated, leftWithoutOwner };
    }),
  );
  if (leftWithoutOwner) {
    await notifyTeamWithoutOwner(team);
  }
  return updated;
}

/**
 * Deprovision a user: remove them from the team and forget them.
 */
export async function deleteScimUser(args: {
  team: Team;
  id: string;
}): Promise<void> {
  const { team } = args;
  const leftWithoutOwner = await transaction(async (trx) => {
    const scimUser = await getScimUser({ teamId: team.id, id: args.id, trx });
    const leftWithoutOwner = await removeMembership({
      team,
      userId: scimUser.userId,
      trx,
    });
    await scimUser.$query(trx).delete();
    return leftWithoutOwner;
  });
  if (leftWithoutOwner) {
    await notifyTeamWithoutOwner(team);
  }
}

/**
 * Find the Argos user owning `email`, or create one.
 *
 * Only a verified email links to an existing user: anyone can add an
 * unverified email to their account, and linking on it would hand them the
 * team membership meant for the email's owner.
 */
async function getOrCreateUserId(args: {
  email: string;
  name: string;
}): Promise<string> {
  const userEmail = await UserEmail.query().findById(args.email);
  if (userEmail?.verified) {
    return userEmail.userId;
  }
  if (userEmail) {
    // Freed as adding the email to another account would: unverified, it may
    // not belong to that user, and the email is the table's primary key.
    await userEmail.$query().delete();
  }
  const { user } = await createAccount({
    email: args.email,
    slug: getSlugFromEmail(args.email),
    accountData: { name: AccountNameSchema.safeParse(args.name).data ?? null },
  });
  return user.id;
}

async function addMembership(args: {
  team: Team;
  userId: string;
  role: TeamUserLevel | null;
  trx: TransactionOrKnex;
}) {
  const { team, userId, role, trx } = args;
  // On an ignored conflict Objection hands back the input, without an id.
  const [inserted] = await TeamUser.query(trx)
    .insert([
      { teamId: team.id, userId, userLevel: role ?? team.defaultUserLevel },
    ])
    .onConflict(["teamId", "userId"])
    .ignore()
    .returning("id");
  // Already a member, the role still applies.
  if (!inserted?.id && role) {
    await changeTeamMembershipLevel({
      teamId: team.id,
      userId,
      level: role,
      trx,
    });
  }
}

/**
 * Remove a member, and tell whether that left the team without an owner:
 * offboarding goes through even for the last owner, as long as other members
 * remain.
 */
async function removeMembership(args: {
  team: Team;
  userId: string;
  trx: TransactionOrKnex;
}): Promise<boolean> {
  const { team, userId, trx } = args;
  const teamUser = await TeamUser.query(trx)
    .select("id", "userLevel")
    .findOne({ teamId: team.id, userId });
  if (!teamUser) {
    return false;
  }
  await deleteTeamMembership({
    teamId: team.id,
    teamUserId: teamUser.id,
    trx,
  });
  if (teamUser.userLevel !== "owner") {
    return false;
  }
  const owner = await TeamUser.query(trx)
    .select("id")
    .findOne({ teamId: team.id, userLevel: "owner" });
  return !owner;
}

/**
 * Nobody can manage a team without an owner until its Identity Provider
 * assigns the owner role to someone, if it maps roles at all: tell Argos, so
 * support can step in.
 */
async function notifyTeamWithoutOwner(team: Team) {
  const { account } = team;
  invariant(account, "team.account not fetched");
  try {
    await notifyDiscord({
      content: [
        "SCIM • ⚠️ Team left without an owner",
        `👥 ${formatDiscordLink(account.displayName, getAccountUrl(account.slug))} (ID: ${account.id})`,
      ].join("\n"),
    });
  } catch (error) {
    captureException(error);
  }
}
