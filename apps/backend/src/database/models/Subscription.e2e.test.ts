import { beforeEach, describe, expect, it } from "vitest";

import { factory, setupDatabase } from "../testing";

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

  describe("#getPeriodEnd", () => {
    describe("month interval", () => {
      it("returns next month's anniversary once this one's has passed", async () => {
        const subscription = await factory.Subscription.create({
          startDate: new Date("2021-03-10").toISOString(),
        });
        const now = new Date("2023-04-26");
        expect(subscription.getPeriodEnd(now, "month").toISOString()).toBe(
          new Date("2023-05-10").toISOString(),
        );
      });

      it("returns this month's anniversary before it has passed", async () => {
        const subscription = await factory.Subscription.create({
          startDate: new Date("2021-03-10").toISOString(),
        });
        const now = new Date("2023-04-05");
        expect(subscription.getPeriodEnd(now, "month").toISOString()).toBe(
          new Date("2023-04-10").toISOString(),
        );
      });

      it("ends where the next month opens when it has no anniversary", async () => {
        // Started on the 31st, so February has no such day: the period running
        // through it closes when March opens rather than overshooting into it.
        const subscription = await factory.Subscription.create({
          startDate: new Date("2015-03-31").toISOString(),
        });
        const now = new Date("2023-02-15");
        expect(subscription.getPeriodEnd(now, "month").toISOString()).toBe(
          new Date(2023, 2, 1).toISOString(),
        );
      });

      it("closes exactly where the period after it opens", async () => {
        // The two have to agree to the millisecond: a gap between them is a day
        // billed to nobody, an overlap is a day billed twice.
        const subscription = await factory.Subscription.create({
          startDate: new Date("2015-03-31").toISOString(),
        });
        const end = subscription.getPeriodEnd(new Date("2023-02-15"), "month");
        const [nextStart] = subscription.getPeriodStarts(
          new Date(end.getTime() + 1000),
          "month",
          1,
        );
        expect(nextStart?.toISOString()).toBe(end.toISOString());
      });
    });

    describe("year interval", () => {
      it("returns next year's anniversary once this one's has passed", async () => {
        const subscription = await factory.Subscription.create({
          startDate: new Date("2021-03-10").toISOString(),
        });
        const now = new Date("2022-04-26");
        expect(subscription.getPeriodEnd(now, "year").toISOString()).toBe(
          new Date("2023-03-10").toISOString(),
        );
      });

      it("slips a day into a leap year, as the period start does", async () => {
        // The anniversary is held as a duration from January 1st — 68 days for
        // March 10th — so February 29th pushes it back a day, and the period
        // ends one day before Stripe renews it. Pinned rather than corrected:
        // `getPeriodStarts` reads the anniversary the same way, so an end that
        // did not slip with it would overlap the period after — the drift has
        // to be fixed in both at once, or not at all.
        const subscription = await factory.Subscription.create({
          startDate: new Date("2021-03-10").toISOString(),
        });
        const now = new Date("2023-04-26");
        expect(subscription.getPeriodEnd(now, "year").toISOString()).toBe(
          new Date("2024-03-09").toISOString(),
        );
        const [nextStart] = subscription.getPeriodStarts(
          new Date("2024-04-26"),
          "year",
          1,
        );
        expect(nextStart?.toISOString()).toBe(
          new Date("2024-03-09").toISOString(),
        );
      });

      it("returns this year's anniversary before it has passed", async () => {
        const subscription = await factory.Subscription.create({
          startDate: new Date("2021-03-10").toISOString(),
        });
        const now = new Date("2023-02-05");
        expect(subscription.getPeriodEnd(now, "year").toISOString()).toBe(
          new Date("2023-03-10").toISOString(),
        );
      });
    });
  });
});
