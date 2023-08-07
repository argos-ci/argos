import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "../testing/index.js";

describe("Purchase", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  describe("#getPurchaseResetDate", () => {
    it("returns current month after reset date", async () => {
      const purchase = await factory.Purchase.create({
        startDate: new Date("2021-03-10").toISOString(),
      });
      const now = new Date("2023-04-26");
      const expectedResetDate = new Date("2023-04-10");
      expect(purchase.getLastResetDate(now).toISOString()).toBe(
        expectedResetDate.toISOString(),
      );
    });

    it("returns previous month before reset date", async () => {
      const purchase = await factory.Purchase.create({
        startDate: new Date("2021-03-10").toISOString(),
      });
      const now = new Date("2023-04-05");
      const expectedResetDate = new Date("2023-03-10");
      expect(purchase.getLastResetDate(now).toISOString()).toBe(
        expectedResetDate.toISOString(),
      );
    });

    it("returns previous year before reset date", async () => {
      const purchase = await factory.Purchase.create({
        startDate: new Date("2015-03-31").toISOString(),
      });
      const now = new Date("2023-01-15");
      const expectedResetDate = new Date("2022-12-31");
      expect(purchase.getLastResetDate(now).toISOString()).toBe(
        expectedResetDate.toISOString(),
      );
    });

    it("returns previous month before reset time", async () => {
      const purchase = await factory.Purchase.create({
        startDate: new Date("2021-03-10T14:00:00.000Z").toISOString(),
      });
      const now = new Date("2023-05-10T13:00:00.000Z");
      const expectedResetDate = new Date("2023-04-10T14:00:00.000Z");
      expect(purchase.getLastResetDate(now).toISOString()).toBe(
        expectedResetDate.toISOString(),
      );
    });

    it("returns previous month after reset time", async () => {
      const purchase = await factory.Purchase.create({
        startDate: new Date("2021-03-10T14:00:00.000Z").toISOString(),
      });
      const now = new Date("2023-05-10T16:00:00.000Z");
      const expectedResetDate = new Date("2023-05-10T14:00:00.000Z");
      expect(purchase.getLastResetDate(now).toISOString()).toBe(
        expectedResetDate.toISOString(),
      );
    });

    it("returns end of month when reset date exceed month time", async () => {
      const purchase = await factory.Purchase.create({
        startDate: new Date("2015-01-31").toISOString(),
      });
      const now = new Date("2023-03-05");
      const resetDate = purchase.getLastResetDate(now).toISOString();
      expect(resetDate).toBe(
        new Date("2023-02-28T24:00:00.000Z").toISOString(),
      );
      expect(resetDate).toBe(new Date("2023-03-01").toISOString());
    });

    it("returns purchase date end of first month", async () => {
      const purchase = await factory.Purchase.create({
        startDate: new Date("2021-03-10").toISOString(),
      });
      const now = new Date("2021-03-15");
      const expectedResetDate = new Date("2021-03-10");
      expect(purchase.getLastResetDate(now).toISOString()).toBe(
        expectedResetDate.toISOString(),
      );
    });
  });
});
