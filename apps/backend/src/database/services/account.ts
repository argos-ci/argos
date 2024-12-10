import { invariant } from "@argos/util/invariant";
import { omitUndefinedValues } from "@argos/util/omitUndefinedValues";
import slugify from "@sindresorhus/slugify";
import type { PartialModelObject } from "objection";

import { sendWelcomeEmail } from "@/email/send.js";
import type { RestEndpointMethodTypes } from "@/github/index.js";
import { getRedisLock } from "@/util/redis/index.js";
import { boom } from "@/web/util.js";

import { Account } from "../models/Account.js";
import { GithubAccount } from "../models/GithubAccount.js";
import { GithubAccountMember } from "../models/GithubAccountMember.js";
import type { GitlabUser } from "../models/GitlabUser.js";
import { GoogleUser } from "../models/GoogleUser.js";
import { Team } from "../models/Team.js";
import { TeamUser } from "../models/TeamUser.js";
import { User } from "../models/User.js";
import { transaction } from "../transaction.js";
import { Model } from "../util/model.js";
import { getPartialModelUpdate } from "../util/update.js";

const RESERVED_SLUGS = [
  "auth",
  "checkout-success",
  "login",
  "vercel",
  "invite",
  "teams",
];

/**
 * Get or create a GitHub account member.
 */
export async function getOrCreateGithubAccountMember(input: {
  githubAccountId: string;
  githubMemberId: string;
}) {
  const lock = await getRedisLock();
  return lock.acquire(
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

/**
 * Join SSO teams if needed.
 */
export async function joinSSOTeams(input: {
  githubAccountId: string;
  userId: string;
}) {
  // Find teams that have SSO enabled
  // with the given GitHub account as a member
  // and where the user is not already a member
  const teams = await Team.query()
    .select("teams.id", "teams.defaultUserLevel")
    .joinRelated("ssoGithubAccount.members")
    .where("ssoGithubAccount:members.githubMemberId", input.githubAccountId)
    .whereNotExists(
      TeamUser.query()
        .where("userId", input.userId)
        .whereRaw('team_users."teamId" = teams.id'),
    );

  // If we found teams, we join the user to them
  if (teams.length > 0) {
    await TeamUser.query().insert(
      teams.map((team) => ({
        teamId: team.id,
        userId: input.userId,
        userLevel: team.defaultUserLevel,
      })),
    );
  }
}

export const checkAccountSlug = async (slug: string) => {
  if (RESERVED_SLUGS.includes(slug)) {
    throw new Error("Slug is reserved for internal usage");
  }
  const slugExists = await Account.query().findOne({ slug });
  if (slugExists) {
    throw new Error("Slug is already used by another account");
  }
};

async function resolveAccountSlug(
  slug: string,
  index: number = 0,
): Promise<string> {
  const nextSlug = index ? `${slug}-${index}` : slug;
  try {
    await checkAccountSlug(nextSlug);
  } catch {
    return resolveAccountSlug(slug, index + 1);
  }

  return nextSlug;
}

export const getGhAccountType = (strType: string) => {
  const type = strType.toLowerCase();
  if (type !== "user" && type !== "organization" && type !== "bot") {
    throw new Error(`Account of "${type}" is not supported`);
  }
  return type;
};

type GetOrCreateGhAccountProps = {
  githubId: number;
  login: string;
  type: GithubAccount["type"];
  email?: string | null | undefined;
  name?: string | null | undefined;
  accessToken?: GithubAccount["accessToken"] | undefined;
  scope?: GithubAccount["scope"] | undefined;
  lastLoggedAt?: GithubAccount["lastLoggedAt"] | undefined;
};

export async function getOrCreateGhAccount(
  props: GetOrCreateGhAccountProps,
): Promise<GithubAccount> {
  const { githubId, type, ...rest } = props;
  const lock = await getRedisLock();
  return lock.acquire(["get-or-create-gh-account", githubId], async () => {
    const existing = await GithubAccount.query().findOne({ githubId });
    if (existing) {
      const toUpdate = getPartialModelUpdate(existing, rest);
      if (toUpdate) {
        return existing.$query().patchAndFetch(toUpdate);
      }
      return existing;
    }

    return GithubAccount.query().insertAndFetch({
      githubId,
      type,
      ...omitUndefinedValues(rest),
    });
  });
}

export async function getOrCreateGhAccountFromGhProfile(
  profile: RestEndpointMethodTypes["users"]["getAuthenticated"]["response"]["data"],
  emails: RestEndpointMethodTypes["users"]["listEmailsForAuthenticatedUser"]["response"]["data"],
  options?: { accessToken?: string; lastLoggedAt?: string; scope?: string },
) {
  const email =
    emails.find((e) => e.primary && e.verified)?.email ??
    emails.find((e) => e.verified)?.email ??
    emails[0]?.email ??
    profile.email;

  return getOrCreateGhAccount({
    githubId: profile.id,
    login: profile.login,
    email,
    name: profile.name,
    type: getGhAccountType(profile.type),
    accessToken: options?.accessToken,
    lastLoggedAt: options?.lastLoggedAt,
    scope: options?.scope,
  });
}

export async function getOrCreateUserAccountFromGhAccount(
  ghAccount: GithubAccount,
  options?: { attachToAccount?: Account | null },
): Promise<Account> {
  const email = ghAccount.email?.toLowerCase() ?? null;
  const attachToAccount = options?.attachToAccount;

  const existingAccount = await Account.query()
    .withGraphFetched("user")
    .findOne({ githubAccountId: ghAccount.id });

  if (attachToAccount) {
    if (existingAccount && existingAccount.id !== attachToAccount.id) {
      throw boom(
        400,
        "GitHub account is already attached to another Argos account",
      );
    }

    if (
      attachToAccount.githubAccountId &&
      attachToAccount.githubAccountId !== ghAccount.id
    ) {
      throw boom(
        400,
        "Argos account is already attached to another GitHub account",
      );
    }

    if (attachToAccount.githubAccountId !== ghAccount.id) {
      return attachToAccount
        .$query()
        .patchAndFetch({ githubAccountId: ghAccount.id });
    }

    return attachToAccount;
  }

  if (existingAccount) {
    const { user } = existingAccount;
    invariant(user, "user not fetched");

    const updateData: PartialModelObject<User> = {};

    if (user.email !== email) {
      const existingEmailUser = await User.query().findOne("email", email);
      if (!existingEmailUser) {
        updateData.email = email;
      }
    }

    if (Object.keys(updateData).length > 0) {
      await user.$query().patchAndFetch(updateData);
    }

    return existingAccount;
  }

  if (email) {
    const existingEmailUser = await User.query()
      .findOne({ email })
      .withGraphFetched("account");

    if (existingEmailUser) {
      invariant(existingEmailUser.account, "account not fetched");

      return existingEmailUser.account.$query().patchAndFetch({
        githubAccountId: ghAccount.id,
      });
    }
  }

  const baseSlug = slugify(ghAccount.login.toLowerCase());
  const slug = await resolveAccountSlug(baseSlug);

  const account = await transaction(async (trx) => {
    const user = await User.query(trx).insertAndFetch({ email });
    return Account.query(trx).insertAndFetch({
      userId: user.id,
      githubAccountId: ghAccount.id,
      name: ghAccount.name,
      slug,
    });
  });

  if (email) {
    await sendWelcomeEmail({ to: email });
  }

  return account;
}

async function getOrCreateUserAccountFromThirdParty<
  TModel extends Model,
>(input: {
  provider: string;
  model: TModel;
  attachToAccount?: Account | null;
  getEmail: (model: TModel) => string;
  getSlug: (model: TModel) => string;
  getName: (model: TModel) => string | null;
  getPotentialEmails: (model: TModel) => string[];
  thirdPartyKey: NonNullable<keyof PartialModelObject<User>>;
}) {
  const {
    provider,
    model,
    attachToAccount,
    getEmail,
    getSlug,
    getName,
    getPotentialEmails,
    thirdPartyKey,
  } = input;
  const email = getEmail(model).trim().toLowerCase();

  if (attachToAccount) {
    const [user, existingUser] = await Promise.all([
      attachToAccount.$relatedQuery("user"),
      User.query()
        .findOne({ [thirdPartyKey]: model.id })
        .withGraphFetched("account"),
    ]);

    if (existingUser) {
      invariant(existingUser.account, "Account not fetched");
      if (user.id !== existingUser.id) {
        throw boom(
          400,
          `${provider} account is already attached to another Argos account`,
        );
      }
    }

    if (user[thirdPartyKey] && user[thirdPartyKey] !== model.id) {
      throw boom(
        400,
        `Argos Account is already attached to another ${provider} account`,
      );
    }

    if (user[thirdPartyKey] !== model.id) {
      await user.$query().patch({ [thirdPartyKey]: model.id });
    }

    return attachToAccount;
  }

  const potentialEmails = getPotentialEmails(model);
  const existingUsers = await User.query()
    .withGraphFetched("account")
    .where(thirdPartyKey, model.id)
    .orWhereIn("email", potentialEmails);

  // If we match multiple accounts, it means that another
  // user has the same email or id
  // In this case we don't update anything and choose the one with gitLabUserId
  if (existingUsers.length > 1) {
    // If we have a user with the same id, we return the account.
    const userWithId = existingUsers.find((u) => u[thirdPartyKey] === model.id);
    if (userWithId) {
      invariant(userWithId.account, "Account not fetched");
      return userWithId.account;
    }

    // Then choose the user by order of potential emails
    const userWithEmail = potentialEmails.reduce<User | null>((acc, email) => {
      return acc ?? existingUsers.find((u) => u.email === email) ?? null;
    }, null);

    invariant(userWithEmail, "A user should be found");
    invariant(userWithEmail.account, "Account not fetched");
    return userWithEmail.account;
  }

  const existingUser = existingUsers[0];

  if (existingUser) {
    invariant(existingUser.account, "Account not fetched");

    // Either update the id or the email if needed
    const data = getPartialModelUpdate(existingUser, {
      [thirdPartyKey]: model.id,
      email,
    });

    if (data) {
      await existingUser.$clone().$query().patch(data);
    }

    return existingUser.account;
  }

  const baseSlug = getSlug(model).toLowerCase();
  invariant(baseSlug, `Invalid slug: ${baseSlug}`);

  const slug = await resolveAccountSlug(slugify(baseSlug));

  const account = await transaction(async (trx) => {
    const user = await User.query(trx).insertAndFetch({
      email,
      [thirdPartyKey]: model.id,
    });
    return Account.query(trx).insertAndFetch({
      userId: user.id,
      name: getName(model),
      slug,
    });
  });

  await sendWelcomeEmail({ to: email });

  return account;
}

export async function getOrCreateUserAccountFromGitlabUser(input: {
  gitlabUser: GitlabUser;
  attachToAccount: Account | null;
}): Promise<Account> {
  const { gitlabUser, attachToAccount } = input;
  return getOrCreateUserAccountFromThirdParty({
    provider: "GitLab",
    model: gitlabUser,
    attachToAccount,
    getEmail: (model) => model.email,
    getSlug: (model) => model.username,
    getName: (model) => model.name,
    getPotentialEmails: (model) => [model.email],
    thirdPartyKey: "gitlabUserId",
  });
}

export async function getOrCreateUserAccountFromGoogleUser(input: {
  googleUser: GoogleUser;
  attachToAccount: Account | null;
}): Promise<Account> {
  const { googleUser, attachToAccount } = input;
  return getOrCreateUserAccountFromThirdParty({
    provider: "Google",
    model: googleUser,
    attachToAccount,
    getEmail: (model) => {
      invariant(model.primaryEmail, "Expected primaryEmail to be defined");
      return model.primaryEmail;
    },
    getSlug: (model) => {
      invariant(model.primaryEmail, "Expected primaryEmail to be defined");
      const emailIdentifier = model.primaryEmail
        .toLocaleLowerCase()
        .split("@")[0];
      invariant(
        emailIdentifier,
        `Invalid email identifier: ${model.primaryEmail}`,
      );
      return emailIdentifier;
    },
    getName: (model) => model.name,
    getPotentialEmails: (model) => {
      invariant(model.emails, "Expected emails to be defined");
      return model.emails;
    },
    thirdPartyKey: "googleUserId",
  });
}
