import { invariant } from "@argos/util/invariant";
import type { TransactionOrKnex } from "objection";

import { sanitizeEmail } from "@/util/email";
import { checkIsPublicEmailDomain } from "@/util/public-email-domains";

import { TeamDomain } from "../models/TeamDomain";
import { TeamUser } from "../models/TeamUser";
import { User } from "../models/User";
import { UserEmail } from "../models/UserEmail";

const DOMAIN_REGEX =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export type AutoInvite = {
  id: string;
  teamId: string;
  domain: string;
  email: string;
};

function getEmailDomain(email: string) {
  const sanitizedEmail = sanitizeEmail(email);
  const atIndex = sanitizedEmail.lastIndexOf("@");
  if (atIndex === -1 || atIndex === sanitizedEmail.length - 1) {
    return null;
  }
  return sanitizedEmail.slice(atIndex + 1);
}

export function normalizeTeamDomain(value: string) {
  const domain = value.trim().toLowerCase();
  if (!DOMAIN_REGEX.test(domain)) {
    throw new Error("Invalid domain");
  }
  return domain;
}

async function getVerifiedEmailByDomain(args: {
  userId: string;
  trx?: TransactionOrKnex;
}) {
  const userEmails = await UserEmail.query(args.trx)
    .select("email")
    .where("userId", args.userId)
    .where("verified", true)
    .orderBy("email", "asc");

  const emailByDomain = new Map<string, string>();
  userEmails.forEach((userEmail) => {
    const domain = getEmailDomain(userEmail.email);
    if (domain && !emailByDomain.has(domain)) {
      emailByDomain.set(domain, userEmail.email);
    }
  });

  return emailByDomain;
}

export async function findVerifiedEmailForDomain(args: {
  userId: string;
  domain: string;
  trx?: TransactionOrKnex;
}) {
  const emailByDomain = await getVerifiedEmailByDomain(args);
  return emailByDomain.get(args.domain) ?? null;
}

export async function getAutoInvitesForUser(args: {
  userId: string;
  trx?: TransactionOrKnex;
}): Promise<AutoInvite[]> {
  const emailByDomain = await getVerifiedEmailByDomain(args);
  if (emailByDomain.size === 0) {
    return [];
  }

  const teamDomains = await TeamDomain.query(args.trx)
    .whereIn("domain", [...emailByDomain.keys()])
    .whereNotExists(
      TeamUser.query(args.trx)
        .select(1)
        .where("userId", args.userId)
        .whereRaw('team_users."teamId" = team_domains."teamId"'),
    )
    .orderBy("createdAt", "asc");

  const autoInvitesByTeamId = new Map<string, AutoInvite>();
  teamDomains.forEach((teamDomain) => {
    if (autoInvitesByTeamId.has(teamDomain.teamId)) {
      return;
    }

    const email = emailByDomain.get(teamDomain.domain);
    invariant(email, "Expected verified email for team domain");
    autoInvitesByTeamId.set(teamDomain.teamId, {
      id: teamDomain.id,
      teamId: teamDomain.teamId,
      domain: teamDomain.domain,
      email,
    });
  });

  return [...autoInvitesByTeamId.values()];
}

export async function hasAutoInviteForUser(args: {
  userId: string;
  trx?: TransactionOrKnex;
}) {
  const autoInvites = await getAutoInvitesForUser(args);
  return autoInvites.length > 0;
}

/**
 * The email domain a user may open one of their teams to, or null when they
 * have none.
 *
 * Only verified addresses count — an unverified one would let anyone claim a
 * domain they do not own — and consumer providers are excluded, since sharing a
 * provider with a stranger says nothing about working with them. The primary
 * address wins when several qualify: it is the one the user thinks of as theirs.
 */
export async function getEligibleAutoJoinDomain(args: {
  userId: string;
  trx?: TransactionOrKnex;
}): Promise<string | null> {
  const emailByDomain = await getVerifiedEmailByDomain(args);
  const eligibleDomains = [...emailByDomain.keys()].filter(
    (domain) => !checkIsPublicEmailDomain(domain),
  );

  if (eligibleDomains.length === 0) {
    return null;
  }

  const user = await User.query(args.trx).findById(args.userId).select("email");
  const primaryDomain = user?.email ? getEmailDomain(user.email) : null;
  if (primaryDomain && eligibleDomains.includes(primaryDomain)) {
    return primaryDomain;
  }

  return eligibleDomains[0] ?? null;
}

/**
 * Let anyone with a verified address on the user's own email domain join the
 * team automatically.
 *
 * Returns the domain that was opened, or null when there is none to open.
 * Idempotent, so re-running it on an already-open team is a no-op.
 *
 * `expectedDomain` is the domain the user was shown when they agreed. Passing it
 * is what keeps consent and effect the same thing: without it the domain is
 * re-derived here, so verifying or re-primarying an address between the offer and
 * the submit would open the team to a domain the user never saw. Omitted only by
 * callers that never displayed one.
 *
 * The caller owns the permission check on the team; this only guarantees the
 * domain is the user's to offer.
 */
export async function enableTeamDomainAutoJoin(args: {
  userId: string;
  teamId: string;
  expectedDomain?: string | null | undefined;
  trx?: TransactionOrKnex;
}): Promise<string | null> {
  const domain = await getEligibleAutoJoinDomain(args);
  if (!domain) {
    return null;
  }
  if (args.expectedDomain && args.expectedDomain !== domain) {
    return null;
  }

  await TeamDomain.query(args.trx)
    .insert({ teamId: args.teamId, domain })
    .onConflict(["teamId", "domain"])
    .ignore();

  return domain;
}

export async function hasAutoInviteForTeam(args: {
  userId: string;
  teamId: string;
  trx?: TransactionOrKnex;
}) {
  const emailByDomain = await getVerifiedEmailByDomain(args);
  if (emailByDomain.size === 0) {
    return false;
  }

  const teamDomain = await TeamDomain.query(args.trx)
    .select("id")
    .where("teamId", args.teamId)
    .whereIn("domain", [...emailByDomain.keys()])
    .first();

  return Boolean(teamDomain);
}
