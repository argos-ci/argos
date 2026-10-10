import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type Account, type Plan, type Project, User } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { sendEmailTemplate } from "@/email/send-email-template";

import { verifyMonthlyReportUnsubscribeToken } from "./monthly-report-unsubscribe";
import {
  enqueueUsageReports,
  sendAccountUsageReport,
  usageReportJob,
} from "./usage-report";

vi.mock("@/email/send-email-template", () => ({
  sendEmailTemplate: vi.fn(),
}));

const mockSendEmailTemplate = vi.mocked(sendEmailTemplate);

describe("sendAccountUsageReport", () => {
  let annualPlan: Plan;
  let account: Account;
  let project: Project;
  let ownerId: string;
  let ownerEmail: string;

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
    const owner = await factory.UserAccount.create({ name: "Jane Doe" });
    ownerId = owner.userId!;
    const ownerUser = await User.query().findById(ownerId);
    ownerEmail = ownerUser!.email!;
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

  it("reports the term so far and projects the rest from the last three months, the most recent counting most", async () => {
    await sendAccountUsageReport(account.id, now);

    expect(mockSendEmailTemplate).toHaveBeenCalledTimes(1);
    const [call] = mockSendEmailTemplate.mock.calls;
    const input = call?.[0];
    expect(input?.template).toBe("usage_report");
    expect(input?.to).toEqual([ownerEmail]);
    if (input?.template !== "usage_report") {
      return;
    }
    const { data } = input;
    expect(data.recipientName).toBe("Jane");
    expect(data.includedScreenshots).toBe(1000);
    expect(data.months).toHaveLength(12);
    // (300 × 3 + 200 × 2 + 100) / 6 = 233 for each month to come.
    expect(
      data.months.map((month) => [month.screenshots, month.projected]),
    ).toEqual([
      [100, false],
      [200, false],
      [300, false],
      ...Array.from({ length: 9 }, () => [233, true]),
    ]);
    // 600 used and 9 × 233 to come: 1697 beyond the plan, at 0.5 each.
    expect(data.projectedOverageCost).toBe(848.5);

    const unsubscribeUrl = new URL(data.unsubscribeUrl);
    expect(unsubscribeUrl.pathname).toBe("/unsubscribe/monthly-report");
    expect(
      verifyMonthlyReportUnsubscribeToken(
        unsubscribeUrl.searchParams.get("token") ?? "",
      ),
    ).toEqual({ userId: ownerId, teamAccountId: account.id });
  });

  it("leaves out the owners who turned the report off", async () => {
    invariant(account.teamId, "a team account has a team");
    const optedOutOwner = await factory.User.create();
    await factory.TeamUser.create({
      teamId: account.teamId,
      userId: optedOutOwner.id,
      userLevel: "owner",
      monthlyReportOptedOutAt: "2026-03-01T10:00:00.000Z",
    });

    await sendAccountUsageReport(account.id, now);

    expect(mockSendEmailTemplate).toHaveBeenCalledTimes(1);
    expect(mockSendEmailTemplate.mock.calls[0]?.[0].to).toEqual([ownerEmail]);
  });

  it("sends the report once per month", async () => {
    await sendAccountUsageReport(account.id, now);
    await sendAccountUsageReport(
      account.id,
      new Date("2026-04-21T10:00:00.000Z"),
    );
    expect(mockSendEmailTemplate).toHaveBeenCalledTimes(1);

    await sendAccountUsageReport(
      account.id,
      new Date("2026-05-16T10:00:00.000Z"),
    );
    expect(mockSendEmailTemplate).toHaveBeenCalledTimes(2);
  });

  it("enqueues the accounts on an annual usage-based plan only", async () => {
    const monthlyPlan = await factory.Plan.create({
      usageBased: true,
      interval: "month",
    });
    const monthlyAccount = await factory.TeamAccount.create();
    const subscriber = await factory.User.create();
    await factory.Subscription.create({
      accountId: monthlyAccount.id,
      planId: monthlyPlan.id,
      currency: "eur",
      provider: "stripe",
      stripeSubscriptionId: "sub_monthly",
      subscriberId: subscriber.id,
      startDate: new Date("2025-01-15T12:00:00.000Z").toISOString(),
      status: "active",
    });
    const push = vi.spyOn(usageReportJob, "push").mockResolvedValue();

    await enqueueUsageReports();

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(account.id);
  });
});
