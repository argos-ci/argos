import {
  Account,
  Organization,
  Plan,
  Purchase,
  User,
} from "@argos-ci/database/models";

export const getAccount = async (payload: {
  marketplace_purchase: { account: { id: number; type: string } };
}) => {
  const { type, id: githubId } = payload.marketplace_purchase.account;

  if (!type) throw new Error(`can't find account without account type`);
  if (!githubId) throw new Error(`can't find account without githubId`);
  if (type.toLowerCase() === "user") {
    const account = await Account.query()
      .joinRelated("user")
      .findOne("user.githubId", githubId);
    return account || null;
  }
  if (type.toLowerCase() === "organization") {
    const account = await Account.query()
      .joinRelated("organization")
      .findOne("organization.githubId", githubId);
    return account || null;
  }
  throw new Error(`can't find account of type : ${type}`);
};

const getOrCreateUser = async (payload: {
  sender: { email: string };
  marketplace_purchase: { account: { id: number; login: string } };
}) => {
  const { email } = payload.sender;
  const { id: githubId, login } = payload.marketplace_purchase.account;
  const user = await User.query().findOne({ githubId });
  if (user) return user;
  return User.query().insertAndFetch({ githubId, login, email });
};

const getOrCreateOrganization = async (payload: {
  marketplace_purchase: { account: { id: number; login: string } };
}) => {
  const { id: githubId, login } = payload.marketplace_purchase.account;
  const organization = await Organization.query().findOne({ githubId });
  if (organization) return organization;
  return Organization.query().insertAndFetch({ githubId, login });
};

export const getOrCreateAccount = async (payload: {
  sender: { email: string };
  marketplace_purchase: {
    account: { id: number; login: string; type: string };
  };
}) => {
  const account = await getAccount(payload);
  if (account) return account;

  if (payload.marketplace_purchase.account.type === "User") {
    const user = await getOrCreateUser(payload);
    return Account.query().insertAndFetch({ userId: user.id });
  }

  const organization = await getOrCreateOrganization(payload);
  return Account.query().insertAndFetch({ organizationId: organization.id });
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
  const activePurchase = await account.getActivePurchase();
  if (activePurchase) {
    await Purchase.query()
      .findById(activePurchase.id)
      .patch({ endDate: payload.effective_date });
  }
};
