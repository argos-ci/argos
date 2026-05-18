import { invariant } from "@argos/util/invariant";
import type { TransactionOrKnex } from "objection";

import { sanitizeEmail } from "@/util/email";

import { TeamDomain } from "../models/TeamDomain";
import { TeamUser } from "../models/TeamUser";
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
