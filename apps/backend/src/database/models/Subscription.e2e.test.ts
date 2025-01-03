import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "../testing/index.js";

describe("Subscription", () => {
  beforeEach(async () => {
    await setupDatabase();
  });

  describe("#getLastResetDate", () => {
    describe("month interval", () => {
      it("returns current month after reset date", async () => {
        const subscription = await factory.Subscription.create({
          startDate: new Date("2021-03-10").toISOString(),
        });
        const now = new Date("2023-04-26");
        const expectedResetDate = new Date("2023-04-10");
        expect(subscription.getLastResetDate(now, "month").toISOString()).toBe(
          expectedResetDate.toISOString(),
        );
      });

      it("returns previous month before reset date", async () => {
        const subscription = await factory.Subscription.create({
          startDate: new Date("2021-03-10").toISOString(),
        });
        const now = new Date("2023-04-05");
        const expectedResetDate = new Date("2023-03-10");
        expect(subscription.getLastResetDate(now, "month").toISOString()).toBe(
          expectedResetDate.toISOString(),
        );
      });

      it("returns previous year before reset date", async () => {
        const subscription = await factory.Subscription.create({
          startDate: new Date("2015-03-31").toISOString(),
        });
        const now = new Date("2023-01-15");
        const expectedResetDate = new Date("2022-12-31");
        expect(subscription.getLastResetDate(now, "month").toISOString()).toBe(
          expectedResetDate.toISOString(),
        );
      });

      it("returns previous month before reset time", async () => {
        const subscription = await factory.Subscription.create({
          startDate: new Date("2021-03-10T14:00:00.000Z").toISOString(),
        });
        const now = new Date("2023-05-10T13:00:00.000Z");
        const expectedResetDate = new Date("2023-04-10T14:00:00.000Z");
        expect(subscription.getLastResetDate(now, "month").toISOString()).toBe(
          expectedResetDate.toISOString(),
        );
      });

      it("returns current month after reset time", async () => {
        const subscription = await factory.Subscription.create({
          startDate: new Date("2021-03-10T14:00:00.000Z").toISOString(),
        });
        const now = new Date("2023-05-10T16:00:00.000Z");
        const expectedResetDate = new Date("2023-05-10T14:00:00.000Z");
        expect(subscription.getLastResetDate(now, "month").toISOString()).toBe(
          expectedResetDate.toISOString(),
        );
      });
    });

    describe("year interval", () => {
      it("returns current year after reset date", async () => {
        const subscription = await factory.Subscription.create({
          startDate: new Date("2021-03-10").toISOString(),
        });
        const now = new Date("2023-04-26");
        const expectedResetDate = new Date("2023-03-10");
        expect(subscription.getLastResetDate(now, "year").toISOString()).toBe(
          expectedResetDate.toISOString(),
        );
      });

      it("returns previous year before reset date", async () => {
        const subscription = await factory.Subscription.create({
          startDate: new Date("2021-03-10").toISOString(),
        });
        const now = new Date("2023-02-05");
        const expectedResetDate = new Date("2022-03-10");
        expect(subscription.getLastResetDate(now, "year").toISOString()).toBe(
          expectedResetDate.toISOString(),
        );
      });

      it("returns previous year before reset time", async () => {
        const subscription = await factory.Subscription.create({
          startDate: new Date("2021-03-10T14:00:00.000Z").toISOString(),
        });
        const now = new Date("2023-03-10T13:00:00.000Z");
        const expectedResetDate = new Date("2022-03-10T14:00:00.000Z");
        expect(subscription.getLastResetDate(now, "year").toISOString()).toBe(
          expectedResetDate.toISOString(),
        );
      });

      it("returns current year after reset time", async () => {
        const subscription = await factory.Subscription.create({
          startDate: new Date("2021-03-10T14:00:00.000Z").toISOString(),
        });
        const now = new Date("2023-03-10T16:00:00.000Z");
        const expectedResetDate = new Date("2023-03-10T14:00:00.000Z");
        expect(subscription.getLastResetDate(now, "year").toISOString()).toBe(
          expectedResetDate.toISOString(),
        );
      });
    });
  });
});
