import { Account, Organization, User } from "@argos-ci/database/models";
import { getOrCreatePurchase, getPlanOrThrow } from "./helpers";

async function getAccountUser(githubId) {
  return Account.query()
    .select("user.*", "user.id as userId", "accounts.id")
    .joinRelated("user")
    .findOne("user.githubId", githubId);
}

async function getAccountOrganization(githubId) {
  return Account.query()
    .select(
      "organization.*",
      "organization.id as organizationId",
      "accounts.id"
    )
    .joinRelated("organization")
    .findOne("organization.githubId", githubId);
}

export async function getAccount(payload) {
  const { type, id: githubId } = payload.marketplace_purchase.account;
  return type.toLowerCase() === "user"
    ? getAccountUser(githubId)
    : getAccountOrganization(githubId);
}

async function getOrCreateUser(payload) {
  const { email } = payload.sender;
  const { id: githubId, login } = payload.marketplace_purchase.account;
  const user = await User.query().findOne({ githubId });
  if (user) return user;
  return User.query().insertAndFetch({ githubId, login, email });
}

async function getOrCreateOrganization(payload) {
  const { id: githubId, login } = payload.marketplace_purchase.account;
  const organization = await Organization.query().findOne({ githubId });
  if (organization) return organization;
  return Organization.query().insertAndFetch({ githubId, login });
}

async function getOrCreateAccount(payload) {
  const account = await getAccount(payload);
  if (account) return account;

  if (payload.marketplace_purchase.account.type === "User") {
    const user = await getOrCreateUser(payload);
    return Account.query().insertAndFetch({ userId: user.id });
  }

  const organization = await getOrCreateOrganization(payload);
  return Account.query().insertAndFetch({ organizationId: organization.id });
}

export async function purchase(payload) {
  const plan = await getPlanOrThrow(payload);
  const account = await getOrCreateAccount(payload);
  await getOrCreatePurchase({
    accountId: account.id,
    planId: plan.id,
  });
}
