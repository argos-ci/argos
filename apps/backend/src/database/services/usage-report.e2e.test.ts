import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Account, Plan, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { sendNotification } from "@/notification";

import { sendUsageReports } from "./usage-report";

vi.mock("@/notification", () => ({
  sendNotification: vi.fn(),
}));

const mockSendNotification = vi.mocked(sendNotification);

describe("sendUsageReports", () => {
  let annualPlan: Plan;
  let account: Account;
  let project: Project;
  let ownerId: string;

  // Fourth month of the term that opened on January 15, 2026: three months
  // have closed.
  const now = new Date("2026-04-20T10:00:00.000Z");

  beforeEach(async () => {
    await setupDatabase();
    vi.clearAllMocks();

    annualPlan = await factory.Plan.create({
      usageBased: true,
      interval: "year",
    });
    account = await factory.TeamAccount.create();
    project = await factory.Project.create({ accountId: account.id });
    const owner = await factory.UserAccount.create();
    ownerId = owner.userId!;
    await factory.TeamUser.create({
      teamId: account.teamId!,
      userId: ownerId,
      userLevel: "owner",
    });
    await factory.Subscription.create({
      accountId: account.id,
      planId: annualPlan.id,
      includedScreenshots: 1000,
      currency: "eur",
      additionalScreenshotPrice: 0.5,
      provider: "stripe",
      stripeSubscriptionId: "sub_usage_report",
      subscriberId: ownerId,
      createdAt: new Date("2025-01-15T12:00:00.000Z").toISOString(),
      startDate: new Date("2025-01-15T12:00:00.000Z").toISOString(),
      status: "active",
    });

    for (const [createdAt, screenshotCount] of [
      // The previous term, which the report must leave out.
      ["2025-12-20T10:00:00.000Z", 5000],
      ["2026-01-20T10:00:00.000Z", 100],
      ["2026-02-20T10:00:00.000Z", 200],
      ["2026-03-20T10:00:00.000Z", 300],
      // The running month, too young to count.
      ["2026-04-16T10:00:00.000Z", 50],
    ] as const) {
      await factory.ScreenshotBucket.create({
        projectId: project.id,
        createdAt,
        screenshotCount,
        storybookScreenshotCount: 0,
      });
    }
  });

  it("reports the term so far and projects the rest from the last three months", async () => {
    await sendUsageReports(now);

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    const [call] = mockSendNotification.mock.calls;
    const input = call?.[0];
    expect(input?.type).toBe("usage_report");
    expect(input?.recipients).toEqual([ownerId]);
    if (input?.type !== "usage_report") {
      return;
    }
    const { data } = input;
    expect(data.includedScreenshots).toBe(1000);
    expect(data.months).toHaveLength(12);
    expect(
      data.months.map((month) => [month.screenshots, month.projected]),
    ).toEqual([
      [100, false],
      [200, false],
      [300, false],
      ...Array.from({ length: 9 }, () => [200, true]),
    ]);
    // 600 used and 9 × 200 to come: 1400 beyond the plan, at 0.5 each.
    expect(data.projectedOverageCost).toBe(700);
  });

  it("sends the report once per month", async () => {
    await sendUsageReports(now);
    await sendUsageReports(new Date("2026-04-21T10:00:00.000Z"));
    expect(mockSendNotification).toHaveBeenCalledTimes(1);

    await sendUsageReports(new Date("2026-05-16T10:00:00.000Z"));
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
  });
});
