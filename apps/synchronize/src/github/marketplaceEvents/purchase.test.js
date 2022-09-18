import moment from "moment";
import { useDatabase, factory } from "@argos-ci/database/testing";
import {
  Purchase,
  Plan,
  Organization,
  User,
  Account,
} from "@argos-ci/database/models";
import { PURCHASE_EVENT_PAYLOAD } from "../../fixtures/purchase-event-payload";
import { getAccount, purchase } from "./purchase";

describe('marketplace "purchase" event', () => {
  useDatabase();

  const purchasePayload = PURCHASE_EVENT_PAYLOAD;
  const { account: payloadAccount, plan: payloadPlan } =
    purchasePayload.marketplace_purchase;

  describe("from a new user", () => {
    beforeEach(async () => {
      await factory.create("Plan", { githubId: payloadPlan.id });
      await purchase(purchasePayload);
    });

    it("should create a user", async () => {
      const users = await User.query();
      expect(users).toHaveLength(1);
      expect(users[0]).toMatchObject({
        githubId: payloadAccount.id,
        login: payloadAccount.login,
      });
    });

    it("should create an account", async () => {
      const account = await getAccount(purchasePayload);
      expect(account).toMatchObject({
        githubId: payloadAccount.id,
        login: payloadAccount.login,
        email: purchasePayload.sender.email,
      });
    });

    it("should add a purchase to the account", async () => {
      const account = await getAccount(purchasePayload);
      const plan = await Plan.query().findOne({ githubId: payloadPlan.id });
      const purchase = await Purchase.query().findOne({
        accountId: account.id,
        planId: plan.id,
      });
      expect(purchase).toBeDefined();
    });
  });

  describe("from a registered user", () => {
    describe("without account", () => {
      let user;
      let previousPurchasesCount;
      let previousUserCount;
      let previousAccountCount;
      let registeredUserPayload;

      beforeEach(async () => {
        user = await factory.create("User");
        await factory.create("Plan", { githubId: payloadPlan.id });
        previousAccountCount = await Account.query().resultSize();
        previousPurchasesCount = await Purchase.query().resultSize();
        previousUserCount = await User.query().resultSize();
        registeredUserPayload = {
          ...purchasePayload,
          marketplace_purchase: {
            ...purchasePayload.marketplace_purchase,
            account: {
              ...purchasePayload.marketplace_purchase.account,
              id: user.githubId,
            },
          },
        };
        await purchase(registeredUserPayload);
      });

      it("should not create user", async () => {
        const usersCount = await User.query().resultSize();
        expect(usersCount).toBe(previousUserCount);
      });

      it("should create an account", async () => {
        const accounts = await Account.query();
        expect(accounts).toHaveLength(previousAccountCount + 1);
        expect(accounts[0]).toMatchObject({
          userId: user.id,
          organizationId: null,
        });
      });

      it("should add a purchase to the account", async () => {
        const account = await getAccount(registeredUserPayload);
        const purchases = await Purchase.query();
        expect(purchases).toHaveLength(previousPurchasesCount + 1);
        expect(purchases[0].accountId).toBe(account.id);
      });
    });

    describe("with account", () => {
      let account;
      let previousAccountCount;
      let previousPurchasesCount;
      let previousUserCount;

      beforeEach(async () => {
        const user = await factory.create("User");
        account = await factory.create("UserAccount", {
          userId: user.id,
        });
        await factory.create("Plan", { githubId: payloadPlan.id });
        previousAccountCount = await Account.query().resultSize();
        previousPurchasesCount = await Purchase.query()
          .where({ accountId: account.id })
          .resultSize();
        previousUserCount = await User.query().resultSize();
        await purchase({
          ...purchasePayload,
          marketplace_purchase: {
            ...purchasePayload.marketplace_purchase,
            account: {
              ...purchasePayload.marketplace_purchase.account,
              id: user.githubId,
            },
          },
        });
      });

      it("should not create user", async () => {
        const usersCount = await User.query().resultSize();
        expect(usersCount).toBe(previousUserCount);
      });

      it("should not create account", async () => {
        const accountCount = await Account.query().resultSize();
        expect(accountCount).toBe(previousAccountCount);
      });

      it("should add a purchase to the account", async () => {
        const purchases = await Purchase.query()
          .where({ accountId: account.id })
          .resultSize();
        expect(purchases).toBe(previousPurchasesCount + 1);
      });
    });

    describe("with previous plan cancelled", () => {
      let previousPurchase;
      let purchases;

      beforeEach(async () => {
        const user = await factory.create("User");
        const account = await factory.create("UserAccount", {
          userId: user.id,
        });
        const plan = await factory.create("Plan", { githubId: payloadPlan.id });
        previousPurchase = await factory.create("Purchase", {
          accountId: account.id,
          planId: plan.id,
          startDate: moment().subtract(60, "days").toISOString(),
          endDate: moment().subtract(20, "days").toISOString(),
        });
        await purchase({
          ...purchasePayload,
          marketplace_purchase: {
            ...purchasePayload.marketplace_purchase,
            account: {
              ...purchasePayload.marketplace_purchase.account,
              id: user.githubId,
            },
          },
        });
        purchases = await Purchase.query();
      });

      it("should not update old purchase", async () => {
        expect(purchases[0]).toMatchObject({
          startDate: new Date(previousPurchase.startDate),
          endDate: new Date(previousPurchase.endDate),
        });
      });

      it("should create a new purchase", async () => {
        expect(purchases).toHaveLength(2);
        expect(purchases[1]).toMatchObject({ endDate: null });
      });
    });
  });

  describe("from a new organization", () => {
    const githubId = 777888999;
    const login = "smooth-code";
    let newOrganizationPayload;

    beforeEach(async () => {
      await factory.create("Plan", { githubId: payloadPlan.id });
      newOrganizationPayload = {
        ...purchasePayload,
        marketplace_purchase: {
          ...purchasePayload.marketplace_purchase,
          account: {
            ...purchasePayload.marketplace_purchase.account,
            type: "Organization",
            id: githubId,
            login,
          },
        },
      };
      await purchase(newOrganizationPayload);
    });

    it("should create an organization", async () => {
      const organizations = await Organization.query();
      expect(organizations).toHaveLength(1);
      expect(organizations[0]).toMatchObject({ githubId, login });
    });
    it("should create an account", async () => {
      const account = await getAccount(newOrganizationPayload);
      expect(account).toMatchObject({ githubId, login });
    });
    it("should create add purchase to account", async () => {
      const account = await getAccount(newOrganizationPayload);
      const plan = await Plan.query().findOne({ githubId: payloadPlan.id });
      const purchase = await Purchase.query().findOne({
        accountId: account.id,
        planId: plan.id,
      });
      expect(purchase).toBeDefined();
    });
  });

  describe("from registered organization", () => {
    describe("without account", () => {
      let organization;
      let previousPurchasesCount;
      let previousOrganizationCount;
      let previousAccountCount;
      let newOrganizationPayload;

      beforeEach(async () => {
        organization = await factory.create("Organization");
        await factory.create("Plan", { githubId: payloadPlan.id });
        previousAccountCount = await Account.query().resultSize();
        previousPurchasesCount = await Purchase.query().resultSize();
        previousOrganizationCount = await Organization.query().resultSize();
        newOrganizationPayload = {
          ...purchasePayload,
          marketplace_purchase: {
            ...purchasePayload.marketplace_purchase,
            account: {
              ...purchasePayload.marketplace_purchase.account,
              type: "organization",
              id: organization.githubId,
            },
          },
        };
        await purchase(newOrganizationPayload);
      });

      it("should not create organization", async () => {
        const organizationsCount = await Organization.query().resultSize();
        expect(organizationsCount).toBe(previousOrganizationCount);
      });

      it("should create an account", async () => {
        const accounts = await Account.query();
        expect(accounts).toHaveLength(previousAccountCount + 1);
        expect(accounts[0]).toMatchObject({
          organizationId: organization.id,
          userId: null,
        });
      });

      it("should add a purchase to the account", async () => {
        const account = await getAccount(newOrganizationPayload);
        const purchases = await Purchase.query();
        expect(purchases).toHaveLength(previousPurchasesCount + 1);
        expect(purchases[0].accountId).toBe(account.id);
      });
    });

    describe("with account", () => {
      let organization;
      let account;
      let previousAccountCount;
      let previousPurchasesCount;
      let previousOrganizationCount;

      beforeEach(async () => {
        organization = await factory.create("Organization");
        account = await factory.create("OrganizationAccount", {
          organizationId: organization.id,
        });
        await factory.create("Plan", { githubId: payloadPlan.id });
        previousAccountCount = await Account.query().resultSize();
        previousPurchasesCount = await Purchase.query()
          .where({ accountId: account.id })
          .resultSize();
        previousOrganizationCount = await Organization.query().resultSize();
        await purchase({
          ...purchasePayload,
          marketplace_purchase: {
            ...purchasePayload.marketplace_purchase,
            account: {
              ...purchasePayload.marketplace_purchase.account,
              type: "organization",
              id: organization.githubId,
            },
          },
        });
      });

      it("should not create organization", async () => {
        const organizationsCount = await Organization.query().resultSize();
        expect(organizationsCount).toBe(previousOrganizationCount);
      });

      it("should not create account", async () => {
        const accountCount = await Account.query().resultSize();
        expect(accountCount).toBe(previousAccountCount);
      });

      it("should add a purchase to the account", async () => {
        const purchases = await Purchase.query()
          .where({ accountId: account.id })
          .resultSize();
        expect(purchases).toBe(previousPurchasesCount + 1);
      });
    });
  });

  describe("of a missing plan", () => {
    it("should not create purchase", async () => {
      expect.assertions(2);
      try {
        await purchase(PURCHASE_EVENT_PAYLOAD);
      } catch (error) {
        expect(error.message).toMatch("missing plan");
        const purchaseCount = await Purchase.query().resultSize();
        expect(purchaseCount).toBe(0);
      }
    });
  });
});
