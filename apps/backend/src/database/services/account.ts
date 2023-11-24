import type { RestEndpointMethodTypes } from "@/github/index.js";

import { Account } from "../models/Account.js";
import { GithubAccount } from "../models/GithubAccount.js";
import { User } from "../models/User.js";
import { transaction } from "../transaction.js";
import type { GitlabUser } from "../models/GitlabUser.js";
import type { PartialModelObject } from "objection";
import { sendWelcomeEmail } from "@/email/send.js";

const RESERVED_SLUGS = [
  "auth",
  "checkout-success",
  "login",
  "vercel",
  "invite",
  "teams",
];

export const checkAccountSlug = async (slug: string) => {
  if (RESERVED_SLUGS.includes(slug)) {
    throw new Error("Slug is reserved for internal usage");
  }
  const slugExists = await Account.query().findOne({ slug });
  if (slugExists) {
    throw new Error("Slug is already used by another account");
  }
};

export const resolveAccountSlug = async (
  slug: string,
  index: number = 0,
): Promise<string> => {
  const nextSlug = index ? `${slug}-${index}` : slug;
  try {
    await checkAccountSlug(nextSlug);
  } catch (e) {
    return resolveAccountSlug(slug, index + 1);
  }

  return nextSlug;
};

export const getGhAccountType = (strType: string) => {
  const type = strType.toLowerCase();
  if (type !== "user" && type !== "organization" && type !== "bot") {
    throw new Error(`Account of "${type}" is not supported`);
  }
  return type;
};

export type GetOrCreateGhAccountProps = {
  githubId: number;
  login: string;
  email?: string | null;
  name?: string | null;
  type: GithubAccount["type"];
};

export const getOrCreateGhAccount = async (
  props: GetOrCreateGhAccountProps,
) => {
  const existing = await GithubAccount.query().findOne({
    githubId: props.githubId,
  });
  if (existing) {
    if (
      existing.login !== props.login ||
      (existing.email !== props.email && props.email) ||
      (existing.name !== props.name && props.name)
    ) {
      const toUpdate: PartialModelObject<GithubAccount> = {
        login: props.login,
      };
      if (props.email) {
        toUpdate.email = props.email;
      }
      if (props.name) {
        toUpdate.name = props.name;
      }
      return existing.$query().patchAndFetch(toUpdate);
    }
    return existing;
  }

  return GithubAccount.query().insertAndFetch({
    githubId: props.githubId,
    login: props.login,
    type: props.type,
    email: props.email ?? null,
    name: props.name ?? null,
  });
};

export const getOrCreateGhAccountFromGhProfile = async (
  profile: RestEndpointMethodTypes["users"]["getAuthenticated"]["response"]["data"],
  emails: RestEndpointMethodTypes["users"]["listEmailsForAuthenticatedUser"]["response"]["data"],
) => {
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
  });
};

export const getOrCreateUserAccountFromGhAccount = async (
  ghAccount: GithubAccount,
  accessToken?: string,
): Promise<Account> => {
  const email = ghAccount.email?.toLowerCase() ?? null;
  const existingAccount = await Account.query()
    .findOne({
      githubAccountId: ghAccount.id,
    })
    .withGraphFetched("user");

  if (existingAccount) {
    if (!existingAccount.user) {
      throw new Error("Invariant: user not found");
    }

    if (
      (accessToken !== undefined &&
        existingAccount.user.accessToken !== accessToken) ||
      existingAccount.user.email !== email
    ) {
      await existingAccount.user.$query().patchAndFetch({
        accessToken: accessToken ?? existingAccount.user.accessToken,
        email,
      });
    }

    return existingAccount;
  }

  if (email) {
    const existingEmailUser = await User.query()
      .findOne({ email })
      .withGraphFetched("account");

    if (existingEmailUser) {
      if (!existingEmailUser.account) {
        throw new Error("Invariant: account not found");
      }

      if (accessToken) {
        await existingEmailUser.$clone().$query().patch({
          accessToken,
        });
      }

      await existingEmailUser.account.$query().patchAndFetch({
        githubAccountId: ghAccount.id,
      });

      return existingEmailUser.account;
    }
  }

  const slug = await resolveAccountSlug(ghAccount.login.toLowerCase());

  const account = await transaction(async (trx) => {
    const user = await User.query(trx).insertAndFetch(
      accessToken ? { email, accessToken } : { email },
    );
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
};

export const getOrCreateUserAccountFromGitlabUser = async (
  gitlabUser: GitlabUser,
): Promise<Account> => {
  const email = gitlabUser.email.toLowerCase();

  const existingUser = await User.query()
    .withGraphFetched("account")
    .findOne({ gitlabUserId: gitlabUser.id });

  if (existingUser) {
    if (!existingUser.account) {
      throw new Error("Invariant: account not found");
    }

    await existingUser.$clone().$query().patch({ email });

    return existingUser.account;
  }

  const existingEmailUser = await User.query()
    .withGraphFetched("account")
    .findOne({ email });

  if (existingEmailUser) {
    if (!existingEmailUser.account) {
      throw new Error("Invariant: account not found");
    }

    await existingEmailUser.$clone().$query().patch({
      gitlabUserId: gitlabUser.id,
    });

    return existingEmailUser.account;
  }

  const slug = await resolveAccountSlug(gitlabUser.username.toLowerCase());

  const account = await transaction(async (trx) => {
    const user = await User.query(trx).insertAndFetch({
      email: gitlabUser.email,
      gitlabUserId: gitlabUser.id,
    });
    return Account.query(trx).insertAndFetch({
      userId: user.id,
      name: gitlabUser.name,
      slug,
    });
  });

  await sendWelcomeEmail({ to: gitlabUser.email });

  return account;
};
