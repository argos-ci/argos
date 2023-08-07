import type { RestEndpointMethodTypes } from "@argos-ci/github";

import { Account } from "../models/Account.js";
import { GithubAccount } from "../models/GithubAccount.js";
import { User } from "../models/User.js";
import { transaction } from "../transaction.js";

export const getGhAccountType = (strType: string) => {
  const type = strType.toLowerCase();
  if (type !== "user" && type !== "organization") {
    throw new Error(`Account of "${type}" is not supported`);
  }
  return type;
};

export type GetOrCreateGhAccountProps = {
  githubId: number;
  login: string;
  email: string | null;
  name: string | null;
  type: "user" | "organization";
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
      existing.email !== props.email ||
      existing.name !== props.name
    ) {
      return existing.$query().patchAndFetch({
        login: props.login,
        email: props.email,
        name: props.name,
      });
    }
    return existing;
  }

  return GithubAccount.query().insertAndFetch({
    githubId: props.githubId,
    login: props.login,
    type: props.type,
    email: props.email,
    name: props.name,
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
      existingAccount.user.email !== ghAccount.email
    ) {
      await existingAccount.user.$query().patchAndFetch({
        accessToken: accessToken ?? existingAccount.user.accessToken,
        email: ghAccount.email,
      });
    }

    return existingAccount;
  }

  return transaction(async (trx) => {
    const data = accessToken
      ? { email: ghAccount.email, accessToken }
      : { email: ghAccount.email };
    const user = await User.query(trx).insertAndFetch(data);
    return Account.query(trx).insertAndFetch({
      userId: user.id,
      githubAccountId: ghAccount.id,
      name: ghAccount.name,
      slug: ghAccount.login.toLowerCase(),
    });
  });
};
