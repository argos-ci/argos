import {
  Account,
  GithubAccount,
  GithubInstallation,
  Plan,
  Purchase,
} from "@argos-ci/database/models";

type PartialMarketplacePurchasePurchasedEventPayload = {
  marketplace_purchase: {
    account: { id: number; type: string; login: string };
  };
};

export const getOrCreateGithubAccount = async (
  payload: PartialMarketplacePurchasePurchasedEventPayload
) => {
  const payloadAccount = payload.marketplace_purchase.account;

  const type = payloadAccount.type.toLowerCase();

  if (type !== "user" && type !== "organization") {
    throw new Error(`Account of "${type}" is not supported`);
  }

  const account = await GithubAccount.query().findOne({
    githubId: payloadAccount.id,
  });

  if (account) return account;

  return GithubAccount.query().insertAndFetch({
    githubId: payloadAccount.id,
    login: payloadAccount.login,
    type,
  });
};

export const getAccount = async (
  payload: PartialMarketplacePurchasePurchasedEventPayload
) => {
  const githubAccount = await getOrCreateGithubAccount(payload);
  const account = await githubAccount.$relatedQuery("account");
  return account ?? null;
};

export const getNewPlanOrThrow = async (payload: {
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
