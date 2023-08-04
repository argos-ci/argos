import type { MarketplacePurchasePurchasedEvent } from "@octokit/webhooks-types";

import {
  Account,
  GithubAccount,
  GithubInstallation,
  Plan,
  Purchase,
} from "@argos-ci/database/models";
import {
  getGhAccountType,
  getOrCreateGhAccount,
  getOrCreateUserAccountFromGhAccount,
} from "@argos-ci/database/services/account";
import { createTeamAccount } from "@argos-ci/database/services/team";

type PartialMarketplacePurchasePurchasedEventPayload = {
  marketplace_purchase: {
    account: {
      id: number;
      type: string;
      login: string;
      organization_billing_email: string;
    };
  };
};

const getOrCreateGhAccountFromEvent = async (
  payload: MarketplacePurchasePurchasedEvent
): Promise<GithubAccount> => {
  const accountType = getGhAccountType(
    payload.marketplace_purchase.account.type
  );
  const ghAccount = await getOrCreateGhAccount({
    githubId: payload.marketplace_purchase.account.id,
    login: payload.marketplace_purchase.account.login,
    type: accountType,
    email: payload.marketplace_purchase.account.organization_billing_email,
    name: null,
  });
  return ghAccount;
};

const findRelevantUserTeam = async (
  userAccount: Account,
  payload: MarketplacePurchasePurchasedEvent,
  githubAccountId: null | string
): Promise<Account> => {
  // Got the user entity linked to this account (to get teams)
  const user = await userAccount.$relatedQuery("user").first();
  // Got the teams owned by the user
  const ownedTeams = await user
    .$relatedQuery("ownedTeams")
    .withGraphFetched("account.projects.githubRepository.githubAccount");
  // Find the team containing projects linked to the GitHub organization
  const relevantTeams = ownedTeams.filter((team) => {
    if (!team?.account?.projects) {
      throw new Error("Invariant: relation not fetched");
    }
    return team.account.projects.some((project) => {
      if (!project.githubRepository) return false;
      if (!project.githubRepository.githubAccount) {
        throw new Error("Invariant: relation not fetched");
      }
      return (
        project.githubRepository.githubAccount.githubId ===
        payload.marketplace_purchase.account.id
      );
    });
  });
  // If there is one relevant team, we use it
  if (relevantTeams.length === 1) {
    const relevantTeam = relevantTeams[0];
    if (!relevantTeam?.account) {
      throw new Error("Invariant: relation not fetched");
    }
    return relevantTeam.account;
  }
  // If there is no relevant team, we create a new team
  const team = await createTeamAccount({
    name: payload.marketplace_purchase.account.login,
    ownerId: user.id,
    githubAccountId,
  });
  return team;
};

export const getOrCreateAccountFromEvent = async (
  payload: MarketplacePurchasePurchasedEvent
): Promise<Account> => {
  const ghAccount = await getOrCreateGhAccountFromEvent(payload);
  const account = await ghAccount.$relatedQuery("account").first();
  // If the account is already linked to a team or a user
  if (account) {
    // If there is a team account found, fine we return it
    if (account.type === "team") {
      return account;
    }

    // If the account is linked to a user, we will try to find a team account
    return findRelevantUserTeam(account, payload, null);
  }

  // If there is no team account found, then we will try several things:
  // -> The buyer has an account on Argos
  //   -> The buyer has a team containing projects linked to the GitHub organization
  //      -> Use this team
  //   -> The buyer has no relevant team
  //      -> Create a new team
  // -> The buyer hasn't an account on Argos
  //   -> Create a new account
  //   -> Create a new team
  // Find or create the GitHub account of the sender (buyer)
  const userGhAccount = await getOrCreateGhAccount({
    githubId: payload.sender.id,
    login: payload.sender.login,
    type: getGhAccountType(payload.sender.type),
    email: payload.sender.email,
    name: null,
  });
  // Find or create the Argos account linked to the GitHub account of the sender (buyer)
  const userAccount = await getOrCreateUserAccountFromGhAccount(userGhAccount);
  return findRelevantUserTeam(userAccount, payload, ghAccount.id);
};

export const getAccount = async (
  payload: PartialMarketplacePurchasePurchasedEventPayload
): Promise<Account | null> => {
  const type = payload.marketplace_purchase.account.type.toLowerCase();
  if (type !== "user" && type !== "organization") {
    throw new Error(`Account of "${type}" is not supported`);
  }
  const githubAccount = await getOrCreateGhAccount({
    githubId: payload.marketplace_purchase.account.id,
    login: payload.marketplace_purchase.account.login,
    type: getGhAccountType(payload.marketplace_purchase.account.type),
    email: payload.marketplace_purchase.account.organization_billing_email,
    name: null,
  });
  const account = await githubAccount.$relatedQuery("account").first();
  return account ?? null;
};

export const getGithubPlan = async (payload: {
  marketplace_purchase: { plan?: { id: number } };
}) => {
  const githubId = payload.marketplace_purchase.plan?.id;
  if (!githubId) throw new Error(`can't find plan without githubId`);
  const plan = await Plan.query().findOne({ githubId });
  if (!plan) throw new Error(`missing plan with githubId: '${githubId}'`);
  return plan;
};

export const cancelPurchase = async (
  payload: { effective_date: string },
  account: Account
) => {
  const activePurchase = await account.$getActivePurchase();
  if (activePurchase && activePurchase.source === "github") {
    await Purchase.query()
      .findById(activePurchase.id)
      .patch({ endDate: payload.effective_date });
  }
};

export const getOrCreateInstallation = async ({
  githubId,
  deleted = false,
}: {
  githubId: number;
  deleted?: boolean;
}) => {
  const data = deleted
    ? { githubId, deleted: true, githubToken: null, githubTokenExpiresAt: null }
    : { githubId, deleted: false };
  const installation = await GithubInstallation.query().findOne({ githubId });
  if (installation) {
    if (installation.deleted !== deleted) {
      return GithubInstallation.query().patchAndFetchById(
        installation.id,
        data
      );
    }
    return installation;
  }
  return GithubInstallation.query().insertAndFetch(data);
};
