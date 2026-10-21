import { AccountNameSchema } from "@argos/schemas/account";
import { invariant } from "@argos/util/invariant";
import type { TransactionOrKnex } from "objection";

import { checkHasAccessToSAML } from "@/auth/saml";
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
  deleteTeamMembership,
  type TeamUserLevel,
} from "@/database/services/team-member";
import { transaction } from "@/database/transaction";
import { isValidPgBigInt } from "@/database/util/biginteger";
import {
  checkIsValidEmail,
  getSlugFromEmail,
  sanitizeEmail,
} from "@/util/email";
import { boom } from "@/util/error";

import { invalidValue, ScimError } from "./error";
import type { ScimUserFilter } from "./filter";
import { getUserAttributes, type ScimUserAttributes } from "./user";

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

const LAST_USED_AT_PRECISION_MS = 60 * 1000;

/**
 * Resolve the team a SCIM token provisions. The token outlives a plan
 * downgrade, so access to SAML SSO is checked on every request.
 */
export async function getTeamFromScimToken(token: string): Promise<Team> {
  const scimToken = TeamScimToken.isScimToken(token)
    ? await TeamScimToken.query()
        .findOne({ tokenHash: hashToken(token) })
        .withGraphFetched("team.account")
    : undefined;
  if (!scimToken) {
    throw new ScimError(401, "Invalid SCIM token.");
  }
  const { team } = scimToken;
  invariant(team?.account, "team.account not fetched");
  if (!(await checkHasAccessToSAML(team.account))) {
    throw new ScimError(403, SAML_REQUIRED_MESSAGE);
  }
  // An initial sync sends several requests per user; one write a minute is
  // enough to tell the token is in use.
  const now = new Date();
  await TeamScimToken.query()
    .findById(scimToken.id)
    .where((qb) =>
      qb
        .whereNull("lastUsedAt")
        .orWhere(
          "lastUsedAt",
          "<",
          new Date(now.getTime() - LAST_USED_AT_PRECISION_MS).toISOString(),
        ),
    )
    .patch({ lastUsedAt: now.toISOString() });
  return team;
}

export async function listScimUsers(args: {
  teamId: string;
  filter: ScimUserFilter | null;
  startIndex: number;
  count: number;
}): Promise<{ totalResults: number; users: TeamScimUser[] }> {
  const { filter } = args;
  const query = TeamScimUser.query().where("teamId", args.teamId);
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
        query.whereRaw(`lower("userName") = lower(?)`, [filter.value]);
        break;
      case "externalId":
        query.where("externalId", filter.value);
        break;
      case "email":
        query.whereRaw(`lower("email") = lower(?)`, [filter.value]);
        break;
    }
  }
  const [totalResults, users] = await Promise.all([
    query.clone().resultSize(),
    args.count > 0
      ? query
          .clone()
          .orderBy("id")
          .offset(args.startIndex - 1)
          .limit(args.count)
      : [],
  ]);
  return { totalResults, users };
}

export async function getScimUser(args: {
  teamId: string;
  id: string;
  trx?: TransactionOrKnex;
  forUpdate?: boolean;
}): Promise<TeamScimUser> {
  const query = isValidPgBigInt(args.id)
    ? TeamScimUser.query(args.trx).findOne({ teamId: args.teamId, id: args.id })
    : null;
  if (query && args.forUpdate) {
    query.forUpdate();
  }
  const scimUser = await query;
  if (!scimUser) {
    throw new ScimError(404, `User ${args.id} not found.`);
  }
  return scimUser;
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
  const email =
    attributes.email ??
    (checkIsValidEmail(attributes.userName) ? attributes.userName : null);
  if (!email || !checkIsValidEmail(email)) {
    throw invalidValue(
      "The user needs a valid email, sent in emails or as the userName.",
    );
  }

  const existing = await TeamScimUser.query()
    .select("id")
    .where("teamId", team.id)
    .whereRaw(`lower("userName") = lower(?)`, [attributes.userName])
    .first();
  if (existing) {
    throw new ScimError(
      409,
      `A user with userName "${attributes.userName}" already exists.`,
      "uniqueness",
    );
  }

  const userId = await getOrCreateUserId({
    email: sanitizeEmail(email),
    name:
      attributes.displayName ??
      [attributes.givenName, attributes.familyName].filter(Boolean).join(" "),
  });

  return transaction(async (trx) => {
    const scimUser = await TeamScimUser.query(trx).insertAndFetch({
      teamId: team.id,
      userId,
      ...attributes,
    });
    if (attributes.active) {
      await addMembership({ team, userId, role: attributes.role, trx });
    }
    return scimUser;
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
  return transaction(async (trx) => {
    const scimUser = await getScimUser({
      teamId: team.id,
      id: args.id,
      trx,
      forUpdate: true,
    });
    const attributes = args.update(getUserAttributes(scimUser));
    const updated = await TeamScimUser.query(trx).patchAndFetchById(
      scimUser.id,
      attributes,
    );
    const { userId } = scimUser;
    if (!attributes.active) {
      if (scimUser.active) {
        await removeMembership({ team, userId, trx });
      }
    } else if (!scimUser.active) {
      await addMembership({ team, userId, role: attributes.role, trx });
    } else if (attributes.role && attributes.role !== scimUser.role) {
      await setMemberLevel({ team, userId, level: attributes.role, trx });
    }
    return updated;
  });
}

/**
 * Deprovision a user: remove them from the team and forget them. The Argos
 * account stays, it belongs to the person.
 */
export async function deleteScimUser(args: {
  team: Team;
  id: string;
}): Promise<void> {
  const { team } = args;
  await transaction(async (trx) => {
    const scimUser = await getScimUser({
      teamId: team.id,
      id: args.id,
      trx,
      forUpdate: true,
    });
    await removeMembership({ team, userId: scimUser.userId, trx });
    await scimUser.$query(trx).delete();
  });
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
  await TeamUser.query(trx)
    .insert({
      teamId: team.id,
      userId,
      userLevel: role ?? team.defaultUserLevel,
    })
    .onConflict(["teamId", "userId"])
    .ignore();
  // Already a member, the role still applies.
  if (role) {
    await setMemberLevel({ team, userId, level: role, trx });
  }
}

/**
 * Set a member's level from their role. The IdP never takes the owner role
 * away from the last owner: nobody would be left to manage the team.
 */
async function setMemberLevel(args: {
  team: Team;
  userId: string;
  level: TeamUserLevel;
  trx: TransactionOrKnex;
}) {
  const { team, userId, level, trx } = args;
  const teamUser = await TeamUser.query(trx)
    .select("id", "userLevel")
    .findOne({ teamId: team.id, userId });
  if (!teamUser || teamUser.userLevel === level) {
    return;
  }
  if (teamUser.userLevel === "owner") {
    // Locked, so two demotions can't each count the other owner and both pass.
    const owners = await TeamUser.query(trx)
      .select("id")
      .where({ teamId: team.id, userLevel: "owner" })
      .forUpdate();
    if (owners.length <= 1) {
      throw new ScimError(
        403,
        "Can't change the role of the last owner of a team.",
      );
    }
  }
  await TeamUser.query(trx).findById(teamUser.id).patch({ userLevel: level });
}

async function removeMembership(args: {
  team: Team;
  userId: string;
  trx: TransactionOrKnex;
}) {
  const teamUser = await TeamUser.query(args.trx)
    .select("id")
    .findOne({ teamId: args.team.id, userId: args.userId });
  if (teamUser) {
    await deleteTeamMembership({
      teamId: args.team.id,
      teamUserId: teamUser.id,
      trx: args.trx,
    });
  }
}
