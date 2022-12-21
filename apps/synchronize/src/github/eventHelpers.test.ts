import {
  Account,
  Organization,
  Plan,
  Purchase,
  User,
} from "@argos-ci/database/models";
import { factory, useDatabase } from "@argos-ci/database/testing";

import {
  ORGANIZATION_PURCHASE_EVENT_PAYLOAD,
  ORGANIZATION_UPDATE_PURCHASE_EVENT_PAYLOAD,
  USER_PURCHASE_EVENT_PAYLOAD,
} from "../fixtures/purchase-event-payload.js";
import {
  getAccount,
  getNewPlanOrThrow,
  getOrCreateAccount,
} from "./eventHelpers.js";
import { handleGitHubEvents } from "./events.js";

async function findOrCreatePlan({ githubId }: { githubId: number }) {
  const plan = await Plan.query().findOne({ githubId });
  if (plan) {
    return plan;
  }

  return Plan.query().insertAndFetch({
    githubId: githubId,
    name: "free 2",
    screenshotsLimitPerMonth: 5000,
  });
}

describe("event helpers", () => {
  useDatabase();

  describe("#getAccount", () => {
    it("of missing user should return null", async () => {
      const account = await getAccount(USER_PURCHASE_EVENT_PAYLOAD);
      expect(account).toBeNull();
    });

    it("of missing organization should return null", async () => {
      const account = await getAccount(ORGANIZATION_PURCHASE_EVENT_PAYLOAD);
      expect(account).toBeNull();
    });

    it("of existing user should return an account", async () => {
      const { id: githubId } =
        USER_PURCHASE_EVENT_PAYLOAD.marketplace_purchase.account;
      const user = await factory.create<User>("User", { githubId });
      await factory.create<Account>("UserAccount", { userId: user.id });
      const account = await getAccount(USER_PURCHASE_EVENT_PAYLOAD);
      expect(account).toMatchObject({ userId: user.id, organizationId: null });
    });

    it("of existing organization should return an account", async () => {
      const { id: githubId } =
        ORGANIZATION_PURCHASE_EVENT_PAYLOAD.marketplace_purchase.account;
      const organization = await factory.create<Organization>("Organization", {
        githubId,
      });
      await factory.create<Account>("OrganizationAccount", {
        organizationId: organization.id,
      });
      const account = await getAccount(ORGANIZATION_PURCHASE_EVENT_PAYLOAD);
      expect(account).toMatchObject({
        userId: null,
        organizationId: organization.id,
      });
    });
  });

  describe("#getOrCreateAccount", () => {
    let account;

    it("should create new user and account", async () => {
      const usersCount = await User.query().resultSize();
      const accountsCount = await Account.query().resultSize();
      const account = await getOrCreateAccount(USER_PURCHASE_EVENT_PAYLOAD);
      const createdUser = await account.$relatedQuery("user");
      expect(createdUser.githubId).toBe(
        USER_PURCHASE_EVENT_PAYLOAD.marketplace_purchase.account.id
      );

      const newUsersCount = await User.query().resultSize();
      expect(newUsersCount).toBe(usersCount + 1);

      const newAccountsCount = await Account.query().resultSize();
      expect(newAccountsCount).toBe(accountsCount + 1);
    });

    it("should create new organization and account", async () => {
      const organizationsCount = await Organization.query().resultSize();
      const accountsCount = await Account.query().resultSize();
      const account = await getOrCreateAccount(
        ORGANIZATION_PURCHASE_EVENT_PAYLOAD
      );
      const createdOrganization = await account.$relatedQuery("organization");
      expect(createdOrganization.githubId).toBe(
        ORGANIZATION_PURCHASE_EVENT_PAYLOAD.marketplace_purchase.account.id
      );

      const newOrganizationsCount = await Organization.query().resultSize();
      expect(newOrganizationsCount).toBe(organizationsCount + 1);

      const newAccountsCount = await Account.query().resultSize();
      expect(newAccountsCount).toBe(accountsCount + 1);
    });

    it("should return existing user account", async () => {
      const { id: githubId } =
        USER_PURCHASE_EVENT_PAYLOAD.marketplace_purchase.account;
      const user = await factory.create<User>("User", { githubId });
      await factory.create<Account>("UserAccount", { userId: user.id });
      const account = await getOrCreateAccount(USER_PURCHASE_EVENT_PAYLOAD);
      expect(account.userId).toBe(user.id);
    });

    it("should return existing organization account", async () => {
      const { id: githubId } =
        ORGANIZATION_PURCHASE_EVENT_PAYLOAD.marketplace_purchase.account;
      const organization = await factory.create<Organization>("Organization", {
        githubId,
      });
      await factory.create<Account>("OrganizationAccount", {
        organizationId: organization.id,
      });
      account = await getOrCreateAccount(ORGANIZATION_PURCHASE_EVENT_PAYLOAD);
      expect(account).toMatchObject({ organizationId: organization.id });
    });
  });

  describe("#getNewPlanOrThrow", () => {
    it("should throw when missing plan", async () => {
      await expect(
        getNewPlanOrThrow(USER_PURCHASE_EVENT_PAYLOAD)
      ).rejects.toThrow("missing plan with githubId: '7766'");
    });

    it("should return existing plan", async () => {
      const { id: githubId } =
        USER_PURCHASE_EVENT_PAYLOAD.marketplace_purchase.plan;
      await factory.create("Plan", { githubId });
      const plan = await getNewPlanOrThrow(USER_PURCHASE_EVENT_PAYLOAD);
      expect(plan.githubId).toBe(githubId);
    });
  });

  describe("handleGitHubEvents", () => {
    describe("marketplace_purchase", () => {
      describe("changed", () => {
        let organization: Organization | undefined;
        let plan: Plan | undefined;
        let purchase: Purchase | undefined;
        let account: Account | undefined;

        const payload = ORGANIZATION_UPDATE_PURCHASE_EVENT_PAYLOAD;

        const planGithubId = payload.marketplace_purchase.plan.id;
        const organizationGithubId = payload.marketplace_purchase.account.id;

        beforeAll(async () => {
          plan = await findOrCreatePlan({ githubId: planGithubId });

          // @ts-ignore
          await handleGitHubEvents({ name: "marketplace_purchase", payload });
          organization = await Organization.query().findOne({
            githubId: organizationGithubId,
          });

          if (!organization) {
            throw Error("User should be created");
          }

          account = await Account.getAccount({
            organizationId: organization.id,
          });
          purchase = await Purchase.query().findOne({ accountId: account.id });
        });

        it("should create an organization", async () => {
          expect(organization).toBeDefined();
          expect(organization!.githubId).toBe(organizationGithubId);
        });

        it("should create an account", async () => {
          expect(account).toBeDefined();
          expect(account!.organization!.githubId).toBe(organizationGithubId);
        });

        it("should create a purchase", async () => {
          expect(purchase).toBeDefined();
          expect(purchase!.planId).toBe(plan!.id);
        });
      });
    });
  });
});
