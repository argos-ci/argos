import { factory, useDatabase } from "../testing/index.js";
import { Account } from "./Account.js";
import { Plan } from "./Plan.js";
import type { Project, Purchase, ScreenshotBucket, Team } from "./index.js";

describe("Account", () => {
  let plans: Plan[];
  let account: Account, vipAccount: Account;
  let bucket1: ScreenshotBucket,
    bucket2: ScreenshotBucket,
    bucket3: ScreenshotBucket,
    bucketOtherOrga: ScreenshotBucket;

  useDatabase();

  beforeEach(async () => {
    const teams = await factory.createMany<Team>("Team", 2);
    // @ts-ignore
    plans = await factory.createMany<Plan>("Plan", [
      { name: "free", screenshotsLimitPerMonth: -1 },
      { name: "standard", screenshotsLimitPerMonth: 10 },
      { name: "pro", screenshotsLimitPerMonth: 100 },
    ]);
    // @ts-ignore
    [account, vipAccount] = await factory.createMany<Account>("TeamAccount", [
      { teamId: teams[0]!.id },
      { teamId: teams[1]!.id, forcedPlanId: plans[2]!.id },
    ]);
    const projects = await factory.createMany<Project>("Project", [
      { accountId: account.id, private: true },
      { accountId: account.id, private: true },
      { accountId: account.id, private: false },
      { accountId: vipAccount.id, private: true },
    ]);
    // @ts-ignore
    [bucket1, bucket2, bucket3, bucketOtherOrga] =
      await factory.createMany<ScreenshotBucket>("ScreenshotBucket", [
        { projectId: projects[0]!.id },
        { projectId: projects[1]!.id },
        { projectId: projects[2]!.id },
        { projectId: projects[3]!.id },
      ]);
  });

  describe("#getActivePurchase", () => {
    it("returns null when no purchase found", async () => {
      const activePurchase = await account.getActivePurchase();
      expect(activePurchase).toBeNull();
    });

    it("returns null when only old purchase found", async () => {
      await factory.create<Purchase>("Purchase", {
        planId: plans[1]!.id,
        accountId: account.id,
        endDate: new Date(2010, 1, 1).toISOString(),
      });
      const activePurchase = await account.getActivePurchase();
      expect(activePurchase).toBeNull();
    });

    it("returns active purchase", async () => {
      await factory.create<Purchase>("Purchase", {
        planId: plans[1]!.id,
        accountId: account.id,
      });
      const activePurchase = await account.getActivePurchase();
      const purchasePlan = await activePurchase!.$relatedQuery("plan");
      expect(purchasePlan!.id).toBe(plans[1]!.id);
    });
  });

  describe("#screenshotsMonthlyLimit", () => {
    it("without purchase returns free plan limit", async () => {
      const screenshotsLimit = await account.getScreenshotsMonthlyLimit();
      expect(screenshotsLimit).toBe(-1);
    });

    it("with purchase returns plan limit", async () => {
      await factory.create("Purchase", {
        planId: plans[1]!.id,
        accountId: account.id,
      });
      const screenshotsLimit = await account.getScreenshotsMonthlyLimit();
      expect(screenshotsLimit).toBe(10);
    });
  });

  describe("#getCurrentConsumptionStartDate", () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    describe("without purchase", () => {
      it("returns first day of month", async () => {
        const startDate = await account.getCurrentConsumptionStartDate();
        expect(startDate).toEqual(startOfMonth);
      });
    });

    describe("with purchase", () => {
      it("returns purchase start date the first month", async () => {
        const purchase = await factory.create("Purchase", {
          planId: plans[1]!.id,
          accountId: account.id,
          startDate: startOfMonth,
        });
        const startDate = await account.getCurrentConsumptionStartDate();
        expect(startDate).toEqual(new Date(purchase.startDate));
      });

      it("returns first day of month from second month", async () => {
        await factory.create("Purchase", {
          planId: plans[1]!.id,
          accountId: account.id,
          startDate: new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            now.getDate()
          ),
        });
        const startDate = await account.getCurrentConsumptionStartDate();
        expect(startDate).toEqual(startOfMonth);
      });
    });
  });

  describe("#getScreenshotsCurrentConsumption", () => {
    it("count screenshots used this month", async () => {
      await factory.createMany("Screenshot", 10, {
        screenshotBucketId: bucket1.id,
      });
      const consumption = await account.getScreenshotsCurrentConsumption();
      expect(consumption).toBe(10);
    });

    it("count screenshots used on other account's repository", async () => {
      await factory.createMany("Screenshot", 10, {
        screenshotBucketId: bucket2.id,
      });
      const consumption = await account.getScreenshotsCurrentConsumption();
      expect(consumption).toBe(10);
    });

    it("ignore screenshots of a public repository", async () => {
      await factory.createMany("Screenshot", 10, {
        screenshotBucketId: bucket3.id,
      });
      const consumption = await account.getScreenshotsCurrentConsumption();
      expect(consumption).toBe(0);
    });

    it("ignore old screenshots", async () => {
      await factory.createMany("Screenshot", 10, {
        screenshotBucketId: bucket2.id,
        createdAt: new Date(2012, 1, 1),
      });
      const consumption = await account.getScreenshotsCurrentConsumption();
      expect(consumption).toBe(0);
    });

    it("ignore screenshots of other account", async () => {
      await factory.createMany("Screenshot", 10, {
        screenshotBucketId: bucketOtherOrga.id,
      });
      const consumption = await account.getScreenshotsCurrentConsumption();
      expect(consumption).toBe(0);
    });
  });

  describe("#getPlan", () => {
    describe("with purchase", () => {
      it("returns purchased plan", async () => {
        await factory.create("Purchase", {
          planId: plans[1]!.id,
          accountId: account.id,
        });
        const plan = await account.getPlan();
        expect(plan!.id).toBe(plans[1]!.id);
      });

      it("with forced plan returns forced plan", async () => {
        await factory.create("Purchase", {
          planId: plans[1]!.id,
          accountId: vipAccount.id,
        });

        const plan = await vipAccount.getPlan();
        expect(plan!.id).toBe(plans[2]!.id);
      });
    });

    describe("without purchase", () => {
      it("with free plan in database returns free plan", async () => {
        const plan = await account.getPlan();
        expect(plan!.id).toBe(plans[0]!.id);
      });

      it("with forced plan returns forced plan", async () => {
        const plan = await vipAccount.getPlan();
        expect(plan!.id).toBe(plans[2]!.id);
      });

      it("without free plan in database returns null", async () => {
        await Account.query().patch({ forcedPlanId: null });
        await Plan.query().delete();
        const plan = await account.getPlan();
        expect(plan).toBeNull();
      });
    });
  });
});
