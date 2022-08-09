import { useDatabase, factory } from "@argos-ci/database/testing";
import { Purchase, Plan, Organization, User } from "@argos-ci/database/models";
import { handleGitHubEvents } from "./events";
import { USER_PURCHASE_EVENT_PAYLOAD } from "../fixtures/marketplace-purchase-events";
import { getAccount } from "../helpers";
import { Account } from "../../../database/src/models/Account";

describe("events", () => {
  useDatabase();

  describe("purchase", () => {
    const payload = USER_PURCHASE_EVENT_PAYLOAD;
    const { sender } = payload;
    const { account: payloadAccount } = payload.marketplace_purchase;
    const { id: planGithubId } = payload.marketplace_purchase.plan;

    describe("by a new user", () => {
      beforeEach(async () => {
        await factory.create("Plan", { githubId: planGithubId });
        await handleGitHubEvents({ name: "marketplace_purchase", payload });
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
        const account = await getAccount({
          type: "user",
          githubId: payloadAccount.id,
        });
        expect(account).toMatchObject({
          githubId: payloadAccount.id,
          login: payloadAccount.login,
          email: sender.email,
        });
      });

      it("should add a purchase to the account", async () => {
        const account = await getAccount({
          type: "user",
          githubId: payloadAccount.id,
        });
        const plan = await Plan.query().findOne({ githubId: planGithubId });
        const purchase = await Purchase.query().findOne({
          accountId: account.id,
          planId: plan.id,
        });
        expect(purchase).toBeDefined();
      });
    });

    describe("by a registered user", () => {
      describe("without account", () => {
        let user;
        let previousPurchasesCount;
        let previousUserCount;
        let previousAccountCount;

        beforeEach(async () => {
          user = await factory.create("User");
          await factory.create("Plan", { githubId: planGithubId });
          previousAccountCount = await Account.query().resultSize();
          previousPurchasesCount = await Purchase.query().resultSize();
          previousUserCount = await User.query().resultSize();
          await handleGitHubEvents({
            name: "marketplace_purchase",
            payload: {
              ...payload,
              marketplace_purchase: {
                ...payload.marketplace_purchase,
                account: {
                  ...payload.marketplace_purchase.account,
                  id: user.githubId,
                },
              },
            },
          });
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
          const account = await getAccount({
            type: "user",
            githubId: user.githubId,
          });
          const purchases = await Purchase.query();
          expect(purchases).toHaveLength(previousPurchasesCount + 1);
          expect(purchases[0].accountId).toBe(account.id);
        });
      });

      describe("with account", () => {
        let user;
        let account;
        let previousAccountCount;
        let previousPurchasesCount;
        let previousUserCount;

        beforeEach(async () => {
          user = await factory.create("User");
          account = await factory.create("Account", {
            userId: user.id,
            organizationId: null,
          });
          await factory.create("Plan", { githubId: planGithubId });
          previousAccountCount = await Account.query().resultSize();
          previousPurchasesCount = await Purchase.query()
            .where({ accountId: account.id })
            .resultSize();
          previousUserCount = await User.query().resultSize();
          await handleGitHubEvents({
            name: "marketplace_purchase",
            payload: {
              ...payload,
              marketplace_purchase: {
                ...payload.marketplace_purchase,
                account: {
                  ...payload.marketplace_purchase.account,
                  id: user.githubId,
                },
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
    });

    describe("by a new organization", () => {
      const githubId = 777888999;
      const login = "smooth-code";

      beforeEach(async () => {
        await factory.create("Plan", { githubId: planGithubId });

        await handleGitHubEvents({
          name: "marketplace_purchase",
          payload: {
            ...payload,
            marketplace_purchase: {
              ...payload.marketplace_purchase,
              account: {
                ...payload.marketplace_purchase.account,
                type: "Organization",
                id: githubId,
                login,
              },
            },
          },
        });
      });

      it("should create an organization", async () => {
        const organizations = await Organization.query();
        expect(organizations).toHaveLength(1);
        expect(organizations[0]).toMatchObject({ githubId, login });
      });
      it("should create an account", async () => {
        const account = await getAccount({ type: "organization", githubId });
        expect(account).toMatchObject({ githubId, login });
      });
      it("should create add purchase to account", async () => {
        const account = await getAccount({ type: "organization", githubId });
        const plan = await Plan.query().findOne({ githubId: planGithubId });
        const purchase = await Purchase.query().findOne({
          accountId: account.id,
          planId: plan.id,
        });
        expect(purchase).toBeDefined();
      });
    });

    describe("by registered organization", () => {
      describe("without account", () => {
        let organization;
        let previousPurchasesCount;
        let previousOrganizationCount;
        let previousAccountCount;

        beforeEach(async () => {
          organization = await factory.create("Organization");
          await factory.create("Plan", { githubId: planGithubId });
          previousAccountCount = await Account.query().resultSize();
          previousPurchasesCount = await Purchase.query().resultSize();
          previousOrganizationCount = await Organization.query().resultSize();
          await handleGitHubEvents({
            name: "marketplace_purchase",
            payload: {
              ...payload,
              marketplace_purchase: {
                ...payload.marketplace_purchase,
                account: {
                  ...payload.marketplace_purchase.account,
                  type: "organization",
                  id: organization.githubId,
                },
              },
            },
          });
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
          const account = await getAccount({
            type: "organization",
            githubId: organization.githubId,
          });
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
          account = await factory.create("Account", {
            organizationId: organization.id,
            userId: null,
          });
          await factory.create("Plan", { githubId: planGithubId });
          previousAccountCount = await Account.query().resultSize();
          previousPurchasesCount = await Purchase.query()
            .where({ accountId: account.id })
            .resultSize();
          previousOrganizationCount = await Organization.query().resultSize();
          await handleGitHubEvents({
            name: "marketplace_purchase",
            payload: {
              ...payload,
              marketplace_purchase: {
                ...payload.marketplace_purchase,
                account: {
                  ...payload.marketplace_purchase.account,
                  type: "organization",
                  id: organization.githubId,
                },
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

    describe("a missing plan", () => {
      beforeEach(async () => {
        await handleGitHubEvents({
          name: "marketplace_purchase",
          payload: {
            ...payload,
            marketplace_purchase: {
              ...payload.marketplace_purchase,
              plan: { id: 404 },
            },
          },
        });
      });

      it("should not create purchase", async () => {
        const purchaseCount = await Purchase.query().resultSize();
        expect(purchaseCount).toBe(0);
      });
    });
  });
});
