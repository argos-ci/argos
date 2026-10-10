import { invariant } from "@argos/util/invariant";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getChangelogNews } from "@/changelog/news";
import type { Account, Project } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { sendEmailTemplate } from "@/email/send-email-template";

import {
  enqueueMonthlyReports,
  monthlyReportJob,
  sendAccountMonthlyReport,
} from "./monthly-report";
import { verifyMonthlyReportUnsubscribeToken } from "./monthly-report-unsubscribe";

vi.mock("@/email/send-email-template", () => ({
  sendEmailTemplate: vi.fn(),
}));

// The changelog is read from argos-ci.com.
vi.mock("@/changelog/news", () => ({
  getChangelogNews: vi.fn().mockResolvedValue([]),
}));

const mockSendEmailTemplate = vi.mocked(sendEmailTemplate);
const mockGetChangelogNews = vi.mocked(getChangelogNews);

describe("sendAccountMonthlyReport", () => {
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

    const annualPlan = await factory.Plan.create({
      usageBased: true,
      interval: "year",
    });
    account = await factory.TeamAccount.create();
    invariant(account.teamId, "a team account has a team");
    project = await factory.Project.create({ accountId: account.id });
    const owner = await factory.User.create();
    invariant(owner.email, "a user is created with an email");
    ownerId = owner.id;
    ownerEmail = owner.email;
    await factory.TeamUser.create({
      teamId: account.teamId,
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
      stripeSubscriptionId: "sub_monthly_report",
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
    await sendAccountMonthlyReport(account.id, now);

    expect(mockSendEmailTemplate).toHaveBeenCalledTimes(1);
    const input = mockSendEmailTemplate.mock.calls[0]?.[0];
    invariant(input?.template === "monthly_report", "a monthly report");
    expect(input.to).toEqual([ownerEmail]);
    const { data } = input;
    expect(data.activity.from).toBe("2026-03-15T12:00:00.000Z");
    expect(data.termEndsAt).toBe("2027-01-15T12:00:00.000Z");
    expect(data.renews).toBe(true);
    expect(data.includedScreenshots).toBe(1000);
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
    expect(input.headers?.["List-Unsubscribe"]).toBe(
      `<${data.unsubscribeUrl}>`,
    );
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

    await sendAccountMonthlyReport(account.id, now);

    expect(mockSendEmailTemplate).toHaveBeenCalledTimes(1);
    expect(mockSendEmailTemplate.mock.calls[0]?.[0].to).toEqual([ownerEmail]);
  });

  it("sends the report once per month", async () => {
    await sendAccountMonthlyReport(account.id, now);
    await sendAccountMonthlyReport(
      account.id,
      new Date("2026-04-21T10:00:00.000Z"),
    );
    expect(mockSendEmailTemplate).toHaveBeenCalledTimes(1);

    await sendAccountMonthlyReport(
      account.id,
      new Date("2026-05-16T10:00:00.000Z"),
    );
    expect(mockSendEmailTemplate).toHaveBeenCalledTimes(2);
    // The news of the second report start where the first one went out.
    expect(mockGetChangelogNews).toHaveBeenLastCalledWith({
      since: now,
      now: new Date("2026-05-16T10:00:00.000Z"),
    });
  });

  it("sends the same email again when a send failed, so a retry delivers it", async () => {
    mockSendEmailTemplate.mockRejectedValueOnce(new Error("Resend is down"));

    await expect(sendAccountMonthlyReport(account.id, now)).rejects.toThrow(
      "Resend is down",
    );
    await sendAccountMonthlyReport(account.id, now);

    expect(mockSendEmailTemplate).toHaveBeenCalledTimes(2);
    const [first, retry] = mockSendEmailTemplate.mock.calls.map(
      ([call]) => call,
    );
    // The same key and the same email: an owner who got the first one does
    // not get it twice.
    expect(retry).toEqual(first);
    expect(retry?.idempotencyKey).toBe(
      `monthly-report/${account.id}/2026-04-15T12:00:00.000Z/${ownerId}`,
    );
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
    const push = vi.spyOn(monthlyReportJob, "push").mockResolvedValue();

    await enqueueMonthlyReports();

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(account.id);
  });
});

it("ends the term on its twelfth monthly anniversary across a February 29", async () => {
  await setupDatabase();
  vi.clearAllMocks();
  const plan = await factory.Plan.create({
    usageBased: true,
    interval: "year",
  });
  const team = await factory.TeamAccount.create();
  invariant(team.teamId, "a team account has a team");
  const owner = await factory.User.create();
  await factory.TeamUser.create({
    teamId: team.teamId,
    userId: owner.id,
    userLevel: "owner",
  });
  await factory.Subscription.create({
    accountId: team.id,
    planId: plan.id,
    includedScreenshots: 1000,
    currency: "eur",
    provider: "stripe",
    stripeSubscriptionId: "sub_leap_year",
    subscriberId: owner.id,
    startDate: new Date("2024-03-15T12:00:00.000Z").toISOString(),
    status: "active",
  });

  await sendAccountMonthlyReport(team.id, new Date("2024-05-20T10:00:00.000Z"));

  const input = mockSendEmailTemplate.mock.calls[0]?.[0];
  invariant(input?.template === "monthly_report", "a monthly report");
  expect(input.data.months).toHaveLength(12);
  expect(input.data.termEndsAt).toBe("2025-03-15T12:00:00.000Z");
});
