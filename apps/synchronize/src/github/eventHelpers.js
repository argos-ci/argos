import { Account, Plan, Organization, User } from "@argos-ci/database/models";

export async function getAccount({ type, id: githubId }) {
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
}

export async function getAccountOrThrow({ id: githubId, type }) {
  const account = await getAccount({ id: githubId, type });
  if (account) return account;
  throw new Error(
    `missing account with type '${type}' and githubId: '${githubId}'`
  );
}

async function getOrCreateUser({ id: githubId, login }, { email }) {
  if (!email) throw new Error(`can't create a user without email`);
  const user = await User.query().findOne({ githubId });
  if (user) return user;
  return User.query().insertAndFetch({ githubId, login, email });
}

async function getOrCreateOrganization({ id: githubId, login }) {
  const organization = await Organization.query().findOne({ githubId });
  if (organization) return organization;
  return Organization.query().insertAndFetch({ githubId, login });
}

export async function getOrCreateAccount(payloadAccount, sender) {
  const account = await getAccount(payloadAccount);
  if (account) return account;

  if (payloadAccount.type.toLowerCase() === "user") {
    const user = await getOrCreateUser(payloadAccount, sender);
    return Account.query().insertAndFetch({ userId: user.id });
  }

  const organization = await getOrCreateOrganization(payloadAccount);
  return Account.query().insertAndFetch({ organizationId: organization.id });
}

export async function getActivePurchaseOrThrow(account) {
  if (!account) throw new Error(`can't find purchase of missing account`);
  const activePurchase = await account.getActivePurchase();
  if (activePurchase) return activePurchase;
  throw new Error(
    `can't find purchase for account with type: '${account.type}' and githubId: '${account.id}'`
  );
}

export async function getNewPlanOrThrow(payload) {
  const { id: githubId } = payload.marketplace_purchase.plan;
  const plan = await Plan.query().findOne({ githubId });
  if (plan) return plan;
  throw new Error(`missing plan with githubId: '${githubId}'`);
}
