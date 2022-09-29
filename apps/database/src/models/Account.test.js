import { factory, useDatabase } from "../testing";

describe("Account", () => {
  let plans;
  let account;
  let bucket1, bucket2, bucket3, bucketOtherOrga;

  useDatabase();

  beforeEach(async () => {
    const organizations = await factory.createMany("Organization", 2);
    plans = await factory.createMany("Plan", [
      { name: "free", screenshotsLimitPerMonth: -1 },
      { name: "standard", screenshotsLimitPerMonth: 10 },
      { name: "pro", screenshotsLimitPerMonth: 100 },
    ]);
    [account] = await factory.createMany("OrganizationAccount", [
      { organizationId: organizations[0].id },
      { organizationId: organizations[1].id },
    ]);
    const repositories = await factory.createMany("Repository", [
      { organizationId: organizations[0].id, private: true },
      { organizationId: organizations[0].id, private: true },
      { organizationId: organizations[0].id, private: false },
      { organizationId: organizations[1].id, private: true },
    ]);
    [bucket1, bucket2, bucket3, bucketOtherOrga] = await factory.createMany(
      "ScreenshotBucket",
      [
        { repositoryId: repositories[0].id },
        { repositoryId: repositories[1].id },
        { repositoryId: repositories[2].id },
        { repositoryId: repositories[3].id },
      ]
    );
  });

  describe("#getActivePurchase", () => {
    it("returns null when no purchase found", async () => {
      const activePurchase = await account.getActivePurchase();
      expect(activePurchase).toBeNull();
    });

    it("returns null when only old purchase found", async () => {
      await factory.create("Purchase", {
        planId: plans[1].id,
        accountId: account.id,
        endDate: new Date(2010, 1, 1),
      });
      const activePurchase = await account.getActivePurchase();
      expect(activePurchase).toBeNull();
    });

    it("returns active purchase", async () => {
      await factory.create("Purchase", {
        planId: plans[1].id,
        accountId: account.id,
      });
      const activePurchase = await account.getActivePurchase();
      expect(activePurchase.plan.id).toBe(plans[1].id);
    });
  });

  describe("#screenshotsMonthlyLimit", () => {
    it("without purchase returns free plan limit", async () => {
      const screenshotsLimit = await account.getScreenshotsMonthlyLimit();
      expect(screenshotsLimit).toBe(-1);
    });

    it("with purchase returns plan limit", async () => {
      await factory.create("Purchase", {
        planId: plans[1].id,
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
          planId: plans[1].id,
          accountId: account.id,
          startDate: startOfMonth,
        });
        const startDate = await account.getCurrentConsumptionStartDate();
        expect(startDate).toEqual(new Date(purchase.startDate));
      });

      it("returns first day of month from second month", async () => {
        await factory.create("Purchase", {
          planId: plans[1].id,
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
});
