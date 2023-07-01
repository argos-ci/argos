import { Account } from "../models/Account.js";
import { GithubAccount } from "../models/GithubAccount.js";
import { User } from "../models/User.js";
import { transaction } from "../transaction.js";

export type PartialGithubProfile = {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
  type: string;
};

export const getOrCreateGhAccountFromGhProfile = async (
  profile: PartialGithubProfile
) => {
  const existing = await GithubAccount.query().findOne({
    githubId: profile.id,
  });
  if (existing) {
    if (
      existing.login !== profile.login ||
      existing.email !== profile.email ||
      existing.name !== profile.name
    ) {
      return existing.$query().patchAndFetch({
        login: profile.login,
        email: profile.email,
        name: profile.name,
      });
    }
    return existing;
  }
  const type = profile.type.toLowerCase();

  if (type !== "user" && type !== "organization") {
    throw new Error(`Account of "${type}" is not supported`);
  }

  return GithubAccount.query().insertAndFetch({
    githubId: profile.id,
    login: profile.login,
    type: "user",
    email: profile.email,
    name: profile.name,
  });
};

export const getOrCreateUserAccountFromGhAccount = async (
  ghAccount: GithubAccount,
  accessToken?: string
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
