import { omitUndefinedValues } from "@argos/util/omitUndefinedValues";
import type { PartialModelObject } from "objection";

import type { RestEndpointMethodTypes } from "@/github/index.js";
import { sanitizeEmail } from "@/util/email.js";
import { redisLock } from "@/util/redis/index.js";

import { GithubAccount } from "../models/GithubAccount.js";
import { GithubAccountMember } from "../models/GithubAccountMember.js";
import { getPartialModelUpdate } from "../util/update.js";

/**
 * Get or create a GitHub account member.
 */
export async function getOrCreateGithubAccountMember(input: {
  githubAccountId: string;
  githubMemberId: string;
}) {
  return redisLock.acquire(
    [
      "getOrCreateGithubAccountMember",
      input.githubMemberId,
      input.githubAccountId,
    ],
    async () => {
      const existing = await GithubAccountMember.query().findOne(input);
      if (existing) {
        return existing;
      }
      return GithubAccountMember.query().insertAndFetch(input);
    },
  );
}

export function getGhAccountType(strType: string) {
  const type = strType.toLowerCase();
  if (type !== "user" && type !== "organization" && type !== "bot") {
    throw new Error(`Account of "${type}" is not supported`);
  }
  return type;
}

type GetOrCreateGhAccountProps = {
  githubId: number;
  login: string;
  type: GithubAccount["type"];
  accessToken?: GithubAccount["accessToken"] | undefined;
  lastLoggedAt?: GithubAccount["lastLoggedAt"] | undefined;
  name?: string | null | undefined;
  scope?: GithubAccount["scope"] | undefined;
  /**
   * Emails associated to the account.
   * Usually from the API.
   * The first one will be the primary email.
   */
  emails?: string[] | null | undefined;
  /**
   * Fallback email to use if there is no existing email.
   */
  fallbackEmail?: string | null | undefined;
};

export async function getOrCreateGhAccount(
  props: GetOrCreateGhAccountProps,
): Promise<GithubAccount> {
  const { githubId, type, fallbackEmail, emails, ...rest } = props;
  return redisLock.acquire(["get-or-create-gh-account", githubId], async () => {
    const existing = await GithubAccount.query().findOne({ githubId });
    const props: PartialModelObject<GithubAccount> = omitUndefinedValues(rest);
    if (emails) {
      props.email = emails[0] ?? null;
      props.emails = emails;
    } else if (fallbackEmail && !existing?.email) {
      props.email = fallbackEmail;
      props.emails = [fallbackEmail];
    } else {
      props.email = existing?.email ?? null;
      props.emails =
        existing?.emails ?? (existing?.email ? [existing.email] : null);
    }

    if (typeof props.email === "string") {
      props.email = sanitizeEmail(props.email);
    }

    if (Array.isArray(props.emails)) {
      props.emails = props.emails.map(sanitizeEmail);
    }

    if (existing) {
      const toUpdate = getPartialModelUpdate(existing, props);
      if (toUpdate) {
        return existing.$query().patchAndFetch(toUpdate);
      }
      return existing;
    }

    return GithubAccount.query().insertAndFetch({
      githubId,
      type,
      ...props,
    });
  });
}

export async function getOrCreateGhAccountFromGhProfile(
  profile: RestEndpointMethodTypes["users"]["getAuthenticated"]["response"]["data"],
  emails: RestEndpointMethodTypes["users"]["listEmailsForAuthenticatedUser"]["response"]["data"],
  options?: { accessToken?: string; lastLoggedAt?: string; scope?: string },
) {
  const primaryEmail =
    emails.find((e) => e.primary)?.email ??
    emails.filter((email) => email.verified)[0]?.email ??
    emails[0]?.email ??
    profile.email ??
    null;

  const sortedEmails = Array.from(
    new Set(
      [primaryEmail, ...emails.map((email) => email.email)].filter(
        (x) => x !== null,
      ),
    ),
  );

  return getOrCreateGhAccount({
    githubId: profile.id,
    login: profile.login,
    emails: sortedEmails,
    name: profile.name,
    type: getGhAccountType(profile.type),
    accessToken: options?.accessToken,
    lastLoggedAt: options?.lastLoggedAt,
    scope: options?.scope,
  });
}
