import type { ErrorCode } from "@argos/error-types";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import type { PartialModelObject } from "objection";

import { sendNotification } from "@/notification/index.js";
import { sanitizeEmail } from "@/util/email.js";
import { slugify } from "@/util/slug.js";
import { boom } from "@/web/util.js";

import { Account } from "../models/Account.js";
import { GithubAccount } from "../models/GithubAccount.js";
import type { GitlabUser } from "../models/GitlabUser.js";
import { GoogleUser } from "../models/GoogleUser.js";
import { Team } from "../models/Team.js";
import { TeamUser } from "../models/TeamUser.js";
import { User } from "../models/User.js";
import { UserEmail } from "../models/UserEmail.js";
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
        .select(1)
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

export async function checkAccountSlug(slug: string) {
  if (RESERVED_SLUGS.includes(slug)) {
    throw new Error("Slug is reserved for internal usage");
  }
  const slugExists = await Account.query().findOne({ slug });
  if (slugExists) {
    throw new Error("Slug is already used by another account");
  }
}

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

export async function getOrCreateUserAccountFromGhAccount(input: {
  ghAccount: GithubAccount;
  attachToAccount: Account | null;
}): Promise<Account> {
  const { ghAccount, attachToAccount } = input;

  return getOrCreateUserAccountFromThirdParty({
    provider: "GitHub",
    model: ghAccount,
    attachToAccount,
    getEmail: (model) => model.email,
    getSlug: (model) => slugify(model.login),
    getName: (model) => model.name,
    getPotentialEmails: (model) => {
      invariant(model.emails, "GitHub account emails is required");
      return model.emails;
    },
    thirdPartyKey: { account: "githubAccountId" },
    errorCodes: {
      alreadyAttachedToArgosAccount: "GITHUB_ACCOUNT_ALREADY_ATTACHED",
      alreadyAttachedToThirdPartyAccount:
        "ARGOS_ACCOUNT_ALREADY_ATTACHED_TO_GITHUB",
      noVerifiedEmail: "GITHUB_NO_VERIFIED_EMAIL",
    },
  });
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
    thirdPartyKey: { user: "gitlabUserId" },
    errorCodes: {
      alreadyAttachedToArgosAccount: "GITLAB_ACCOUNT_ALREADY_ATTACHED",
      alreadyAttachedToThirdPartyAccount:
        "ARGOS_ACCOUNT_ALREADY_ATTACHED_TO_GITLAB",
      noVerifiedEmail: "GITLAB_NO_VERIFIED_EMAIL",
    },
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
    thirdPartyKey: { user: "googleUserId" },
    errorCodes: {
      alreadyAttachedToArgosAccount: "GOOGLE_ACCOUNT_ALREADY_ATTACHED",
      alreadyAttachedToThirdPartyAccount:
        "ARGOS_ACCOUNT_ALREADY_ATTACHED_TO_GOOGLE",
      noVerifiedEmail: "GOOGLE_NO_VERIFIED_EMAIL",
    },
  });
}

async function getOrCreateUserAccountFromThirdParty<
  TModel extends Model,
>(input: {
  provider: string;
  model: TModel;
  attachToAccount?: Account | null;
  getEmail: (model: TModel) => string | null;
  getSlug: (model: TModel) => string;
  getName: (model: TModel) => string | null;
  getPotentialEmails: (model: TModel) => string[];
  thirdPartyKey:
    | { user: "gitlabUserId" | "googleUserId" }
    | { account: "githubAccountId" };
  errorCodes: {
    alreadyAttachedToArgosAccount: ErrorCode;
    alreadyAttachedToThirdPartyAccount: ErrorCode;
    noVerifiedEmail: ErrorCode;
  };
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
    errorCodes,
  } = input;

  const getThirdPartyValue = (user: User) => {
    if ("user" in thirdPartyKey) {
      return user[thirdPartyKey.user];
    }
    if ("account" in thirdPartyKey) {
      invariant(user.account, "Expected user.account to be defined");
      return user.account[thirdPartyKey.account];
    }
    assertNever(thirdPartyKey);
  };

  const rawEmail = getEmail(model);
  const email = rawEmail ? sanitizeEmail(rawEmail) : null;

  if (attachToAccount) {
    const [user, existingUser] = await Promise.all([
      attachToAccount.$relatedQuery("user").withGraphFetched("account"),
      (() => {
        const query = User.query().withGraphJoined("account");
        if ("user" in thirdPartyKey) {
          return query.findOne({ [thirdPartyKey.user]: model.id });
        }
        if ("account" in thirdPartyKey) {
          return query.findOne(`account.${thirdPartyKey.account}`, model.id);
        }
        assertNever(thirdPartyKey);
      })(),
    ]);

    if (existingUser) {
      invariant(existingUser.account, "Account not fetched");
      if (user.id !== existingUser.id) {
        throw boom(
          400,
          `${provider} account is already attached to another Argos account`,
          { code: errorCodes.alreadyAttachedToArgosAccount },
        );
      }
    }

    const thirdPartyValue = getThirdPartyValue(user);

    if (thirdPartyValue && thirdPartyValue !== model.id) {
      throw boom(
        400,
        `Argos Account is already attached to another ${provider} account`,
        { code: errorCodes.alreadyAttachedToThirdPartyAccount },
      );
    }

    if (thirdPartyValue !== model.id) {
      if ("user" in thirdPartyKey) {
        await user.$query().patch({ [thirdPartyKey.user]: model.id });
      } else if ("account" in thirdPartyKey) {
        invariant(user.account, "Expected user.account to be defined");
        await user.account
          .$query()
          .patch({ [thirdPartyKey.account]: model.id });
      } else {
        assertNever(thirdPartyKey);
      }
    }

    return attachToAccount;
  }

  const potentialEmails = getPotentialEmails(model).map(sanitizeEmail);
  const allEmails = Array.from(
    new Set([email, ...potentialEmails].filter((x) => x !== null)),
  );
  const existingUsers = await (() => {
    const query = User.query();

    if (allEmails.length) {
      query
        .withGraphJoined("[account, emails]")
        .whereIn("emails.email", allEmails);
    }

    if ("user" in thirdPartyKey) {
      return query
        .withGraphFetched("account")
        .orWhere(thirdPartyKey.user, model.id);
    }

    if ("account" in thirdPartyKey) {
      return query
        .withGraphJoined("account")
        .orWhere(`account.${thirdPartyKey.account}`, model.id);
    }

    assertNever(thirdPartyKey);
  })();

  const existingUser = (() => {
    // If we match multiple accounts, it means that another
    // user has the same email or id
    // In this case we don't update anything and choose the one with gitLabUserId
    if (existingUsers.length > 1) {
      // If we have a user with the same id, we return the account.
      const userWithId = existingUsers.find(
        (u) => getThirdPartyValue(u) === model.id,
      );
      if (userWithId) {
        return userWithId;
      }

      // Then choose the user by order of potential emails
      const userWithEmail = allEmails.reduce<User | null>((acc, email) => {
        return (
          acc ??
          existingUsers.find((user) => {
            invariant(user.emails, "Expected user.emails to be defined");
            return user.emails.some((userEmail) => userEmail.email === email);
          }) ??
          null
        );
      }, null);

      invariant(userWithEmail, "A user should be found");
      return userWithEmail;
    }

    return existingUsers[0];
  })();

  if (existingUser) {
    invariant(existingUser.account, "Account not fetched");

    const existingUserEmails = existingUser.emails;
    invariant(existingUserEmails, "Expected user.emails to be defined");
    const existingUserEmailsSet = new Set(
      existingUserEmails.map((email) => email.email),
    );

    await transaction(async (trx) => {
      if (email && !existingUserEmailsSet.has(email)) {
        // Add missing emails to the user
        await UserEmail.query(trx).insert({
          userId: existingUser.id,
          email,
          verified: true,
        });
      }

      // Either update the id or the email if needed
      const userData = getPartialModelUpdate(existingUser, {
        email: existingUser.email ?? email,
        deletedAt: null,
        ...("user" in thirdPartyKey ? { [thirdPartyKey.user]: model.id } : {}),
      });

      invariant(existingUser.account, "account must be defined");

      const accountData = getPartialModelUpdate(
        existingUser.account,
        "account" in thirdPartyKey ? { [thirdPartyKey.account]: model.id } : {},
      );

      await Promise.all([
        accountData
          ? existingUser.account.$clone().$query(trx).patch(accountData)
          : null,
        userData ? existingUser.$clone().$query(trx).patch(userData) : null,
      ]);
    });

    return existingUser.account;
  }

  if (!email) {
    throw boom(
      400,
      `No verified email could be found on the ${provider} account`,
      {
        code: errorCodes.noVerifiedEmail,
      },
    );
  }

  const baseSlug = getSlug(model).toLowerCase();
  invariant(baseSlug, `Invalid slug: ${baseSlug}`);

  const slug = await resolveAccountSlug(slugify(baseSlug));

  const { account, user } = await transaction(async (trx) => {
    const userData: PartialModelObject<User> = { email };
    if ("user" in thirdPartyKey) {
      userData[thirdPartyKey.user] = model.id;
    }
    const user = await User.query(trx).insertAndFetch(userData);
    await UserEmail.query(trx).insert({
      userId: user.id,
      email,
      verified: true,
    });
    const accountData: PartialModelObject<Account> = {
      userId: user.id,
      name: getName(model),
      slug,
    };
    if ("account" in thirdPartyKey) {
      accountData[thirdPartyKey.account] = model.id;
    }
    const account = await Account.query(trx).insertAndFetch(accountData);
    return { account, user };
  });

  await sendNotification({
    type: "welcome",
    data: {},
    recipients: [user.id],
  });

  return account;
}
