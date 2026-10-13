import { addDays, formatISODay } from "@argos/util/date";
import { formatDate } from "@argos/util/date-format";
import { invariant } from "@argos/util/invariant";
import { sumBy } from "lodash-es";
import { Section, Text } from "react-email";
import { z } from "zod";

import config from "@/config";
import { chunk } from "@/util/chunk";

import {
  EmailLayout,
  H2,
  InfoText,
  Link,
  Paragraph,
  Signature,
} from "../components";
import { defineEmailTemplate } from "../template";
import { formatAmount } from "../util";

const baseUrl = config.get("server.url");

// The scales the app is drawn with: Radix violet, orange, green and amber, and
// Tailwind zinc greys.
const colors = {
  text: "#09090b",
  muted: "#71717a",
  faint: "#a1a1aa",
  border: "#e4e4e7",
  violet: "#6e56cf",
  violetText: "#5746af",
  violetBorder: "#e4dcfd",
  violetLight: "#e1d9ff",
  overage: "#f76b15",
  overageText: "#cc4e00",
  overageTint: "#fff8f2",
  overageLight: "#ffdcc3",
  track: "#f1f1f3",
  success: "#218358",
  successTint: "#e6f6eb",
  overagePill: "#ffefd6",
  newText: "#ab6400",
  newTint: "#fff4d5",
};

const MonthSchema = z.object({
  /** First day of the month of the term, as an ISO date. */
  startsAt: z.string(),
  screenshots: z.number(),
  /** Whether the month is still to come, and its count an estimate. */
  projected: z.boolean(),
});

const ActivitySchema = z.object({
  /** The month the activity covers: the last one of the term that closed. */
  from: z.string(),
  to: z.string(),
  pullRequests: z.object({
    checked: z.number(),
    /** Fixed after Argos flagged a change that did not come from flaky tests. */
    fixedAfterFlag: z.number(),
    /** Counted once per commit, however many build names it built. */
    intermediateCommits: z.number(),
  }),
  /** Screenshots a person approved or rejected, automatic approvals left out. */
  changesReviewed: z.object({ current: z.number(), previous: z.number() }),
  /** Tests that ran on the reference branch, and the ones new to it. */
  tests: z.object({ covered: z.number(), added: z.number() }),
  flakyTests: z.object({
    current: z.number(),
    previous: z.number(),
    top: z.array(
      z.object({
        name: z.string(),
        buildName: z.string(),
        flakiness: z.number(),
        url: z.string(),
        /** Flaky this month, and not the month before. */
        newThisMonth: z.boolean(),
      }),
    ),
  }),
  /** Screenshots by project and build name, the largest first. */
  screenshotsByBuildName: z.array(
    z.object({
      label: z.string(),
      current: z.number(),
      previous: z.number(),
    }),
  ),
});

export type MonthlyReportActivity = z.infer<typeof ActivitySchema>;

const NewsItemSchema = z.object({
  title: z.string(),
  summary: z.string(),
  url: z.string(),
});

export type MonthlyReportNewsItem = z.infer<typeof NewsItemSchema>;

const MonthlyReportSchema = z.object({
  accountName: z.string().nullish(),
  accountSlug: z.string(),
  currency: z.enum(["usd", "eur"]),
  /** How often the plan is billed. */
  interval: z.enum(["month", "year"]),
  /** Screenshots the plan includes over a term, or a month on a monthly plan. */
  includedScreenshots: z.number(),
  /**
   * Overage the closed months of the term already add up to, or the one of
   * the reported month on a monthly plan.
   */
  currentOverageCost: z.number(),
  /**
   * Overage the term would be billed when it ends, at the current pace. Null
   * on a monthly plan, and while too few months have closed to project from.
   */
  projectedOverageCost: z.number().nullable(),
  /** On a monthly plan, the term is the reported month. */
  termStartsAt: z.string(),
  /** The renewal, or the end date of a cancelled subscription. */
  termEndsAt: z.string(),
  /** False once the subscription is cancelled. */
  renews: z.boolean(),
  /** The spend limit past which new builds are refused, if the team set one. */
  blockingSpendLimit: z.number().nullable(),
  /**
   * Every month of the term, the ones to come included. On a monthly plan, the
   * last billed months.
   */
  months: z.array(MonthSchema),
  activity: ActivitySchema,
  /** What shipped in Argos since the previous report, from its changelog. */
  news: z.array(NewsItemSchema),
});

type MonthlyReportData = z.infer<typeof MonthlyReportSchema>;
type Month = MonthlyReportData["months"][number];

const previewMonths: [string, number, boolean?][] = [
  ["2026-01-15", 98_000],
  ["2026-02-15", 105_000],
  ["2026-03-15", 112_000],
  ["2026-04-15", 120_000],
  ["2026-05-15", 118_000],
  ["2026-06-15", 131_000],
  ["2026-07-15", 125_000],
  ["2026-08-15", 138_000],
  ["2026-09-15", 146_000],
  ["2026-10-15", 139_833, true],
  ["2026-11-15", 139_833, true],
  ["2026-12-15", 139_833, true],
];

/**
 * The monthly report of a team on a usage-based plan: what Argos did for it
 * over the month, then where its plan stands. Annual overage is invoiced once,
 * when the term ends, so this is where a team that does not watch its usage
 * sees it coming; on a monthly plan, it says what the month's invoice bills.
 */
export const handler = defineEmailTemplate({
  type: "monthly_report",
  schema: MonthlyReportSchema,
  previewData: {
    accountName: "Acme",
    accountSlug: "acme",
    currency: "eur",
    interval: "year",
    includedScreenshots: 1_200_000,
    currentOverageCost: 0,
    projectedOverageCost: 468.75,
    termStartsAt: "2026-01-15",
    termEndsAt: "2027-01-15",
    renews: true,
    blockingSpendLimit: null,
    months: previewMonths.map(([startsAt, screenshots, projected]) => ({
      startsAt,
      screenshots,
      projected: projected ?? false,
    })),
    activity: {
      from: "2026-09-15",
      to: "2026-10-15",
      pullRequests: {
        checked: 180,
        fixedAfterFlag: 41,
        intermediateCommits: 412,
      },
      changesReviewed: { current: 1840, previous: 1620 },
      tests: { covered: 4320, added: 120 },
      flakyTests: {
        current: 14,
        previous: 11,
        top: [
          {
            name: "checkout › payment form",
            buildName: "e2e",
            flakiness: 0.62,
            url: "https://app.argos-ci.com/acme/web/tests/WEB-a1b2",
            newThisMonth: true,
          },
          {
            name: "Button / Loading",
            buildName: "storybook",
            flakiness: 0.48,
            url: "https://app.argos-ci.com/acme/web/tests/WEB-c3d4",
            newThisMonth: false,
          },
          {
            name: "dashboard › charts",
            buildName: "e2e",
            flakiness: 0.41,
            url: "https://app.argos-ci.com/acme/web/tests/WEB-e5f6",
            newThisMonth: false,
          },
        ],
      },
      screenshotsByBuildName: [
        { label: "web · e2e", current: 71_000, previous: 52_000 },
        { label: "web · storybook", current: 38_000, previous: 39_000 },
        { label: "admin · e2e", current: 24_000, previous: 21_000 },
        { label: "mobile · e2e", current: 9_000, previous: 0 },
        { label: "Other", current: 4_000, previous: 4_500 },
      ],
    },
    news: [
      {
        title: "Journeys",
        summary:
          "The build review unfolds the journey a screenshot belongs to as a strip of steps, so you see where a change sits in the checkout, the signup or the onboarding your test walked.",
        url: "https://argos-ci.com/changelog/2026-09-12-journeys",
      },
      {
        title: "Custom domains",
        summary:
          "Point your own domain at your production deployments with a single DNS record, and Argos issues and installs the TLS certificate automatically.",
        url: "https://argos-ci.com/changelog/2026-09-01-custom-domains",
      },
    ],
  },
  email: renderMonthlyReport,
});

function renderMonthlyReport(props: MonthlyReportData) {
  const { months, includedScreenshots, currency, activity } = props;
  const accountName = props.accountName || props.accountSlug;

  const closed = months.filter((month) => !month.projected);
  const lastMonth = closed.at(-1);
  invariant(lastMonth, "a report covers a closed month");
  const previousMonth = closed.at(-2);
  // A monthly plan bills the overage of the month with its invoice.
  const monthOverage =
    props.interval === "month"
      ? getAmountWorthStating(props.currentOverageCost)
      : null;
  const { pullRequests, flakyTests } = activity;

  const settingsHref = new URL(
    `/${props.accountSlug}/settings/billing#monthly-report`,
    baseUrl,
  ).href;
  const testsHref = new URL(`/${props.accountSlug}/~/tests`, baseUrl).href;
  const analyticsUrl = new URL(`/${props.accountSlug}/~/analytics`, baseUrl);
  // The days of the reported month, so analytics counts the same screenshots
  // as the report rather than a calendar month. The last day is the one before
  // the month closes: analytics reads it to its end.
  analyticsUrl.search = new URLSearchParams({
    period: "custom",
    from: formatISODay(new Date(activity.from)),
    to: formatISODay(addDays(new Date(activity.to), -1)),
  }).toString();
  const analyticsHref = analyticsUrl.href;
  const period = `${formatDate(new Date(activity.from), "longMonthDay")} to ${formatDate(new Date(activity.to), "longDate")}`;

  return {
    subject: `Your Argos monthly report for ${accountName}`,
    body: (
      <EmailLayout
        preview={`${countOf(pullRequests.checked, "pull request")} checked, ${formatCount(pullRequests.fixedAfterFlag)} fixed after a visual change was flagged.`}
        header={
          <>
            <div
              style={{
                fontSize: 14,
                lineHeight: "20px",
                fontWeight: 600,
                color: colors.text,
              }}
            >
              Monthly report for {accountName}
            </div>
            <div
              style={{ fontSize: 13, lineHeight: "20px", color: colors.text }}
            >
              {period}
            </div>
          </>
        }
      >
        <StatGrid
          style={{ marginTop: 24 }}
          stats={[
            {
              value: formatCount(pullRequests.checked),
              label: `${plural(pullRequests.checked, "pull request")} checked`,
              detail: `${countOf(pullRequests.intermediateCommits, "intermediate commit")} along the way`,
            },
            {
              value: formatCount(pullRequests.fixedAfterFlag),
              label: "fixed after Argos flagged a visual change",
            },
            {
              value: formatCount(activity.changesReviewed.current),
              delta: <Delta {...activity.changesReviewed} />,
              label: `visual ${plural(activity.changesReviewed.current, "change")} reviewed`,
            },
            {
              value: formatCount(activity.tests.covered),
              label: `${plural(activity.tests.covered, "test")} covered`,
              detail: `${formatCount(activity.tests.added)} new this month`,
            },
          ]}
        />

        <SectionTitle>Usage</SectionTitle>
        <StatGrid
          stats={[
            {
              value: formatCompact(lastMonth.screenshots),
              delta: previousMonth ? (
                <Delta
                  current={lastMonth.screenshots}
                  previous={previousMonth.screenshots}
                />
              ) : null,
              label: "screenshots this month",
              detail:
                props.interval === "month"
                  ? `${formatCompact(includedScreenshots)} included in your plan`
                  : null,
            },
            ...(monthOverage === null
              ? []
              : [
                  {
                    value: formatAmount(monthOverage, currency),
                    label: "beyond your plan",
                  },
                ]),
          ]}
        />
        <MonthlyBars months={months} />
        {activity.screenshotsByBuildName.length > 1 ? (
          <BuildNameTable rows={activity.screenshotsByBuildName} />
        ) : null}
        <SectionLink href={analyticsHref}>See analytics</SectionLink>

        {props.interval === "year" ? <AnnualPlan report={props} /> : null}

        <SectionTitle>Test health</SectionTitle>
        <Paragraph style={{ margin: 0 }}>
          <strong>
            {flakyTests.current === 0
              ? "No flaky tests"
              : countOf(flakyTests.current, "flaky test")}
          </strong>{" "}
          this month
          <Delta
            current={flakyTests.current}
            previous={flakyTests.previous}
            increaseIsBad
            suffix=" vs last month"
          />
        </Paragraph>
        {flakyTests.top.length > 0 ? (
          <Table style={{ marginTop: 8 }}>
            {flakyTests.top.map((test) => (
              <tr key={test.url}>
                <td style={rowCellStyle}>
                  <Link href={test.url}>{test.name}</Link>{" "}
                  <span style={{ color: colors.faint }}>{test.buildName}</span>
                  {test.newThisMonth ? <NewPill /> : null}
                </td>
                <td
                  style={{
                    ...numericCellStyle,
                    paddingLeft: 12,
                    color: colors.overageText,
                  }}
                >
                  {Math.round(test.flakiness * 100)}% flaky
                </td>
              </tr>
            ))}
          </Table>
        ) : null}
        <SectionLink href={testsHref}>See all tests</SectionLink>

        {props.news.length > 0 ? (
          <>
            <SectionTitle>What’s new in Argos</SectionTitle>
            {props.news.map((item) => (
              <Paragraph key={item.url} style={{ margin: "0 0 12px" }}>
                <Link href={item.url}>
                  <strong>{item.title}</strong>
                </Link>
                <br />
                <span style={{ fontSize: 13, color: colors.muted }}>
                  {item.summary}
                </span>
              </Paragraph>
            ))}
            <SectionLink href="https://argos-ci.com/changelog">
              See the changelog
            </SectionLink>
          </>
        ) : null}

        <Section style={{ marginTop: 32 }}>
          <Signature />
        </Section>
        <InfoText>
          You receive this monthly report as an owner of {accountName}. You can
          turn it off in the <Link href={settingsHref}>billing settings</Link>.
        </InfoText>
      </EmailLayout>
    ),
  };
}

const axisLabelStyle = {
  fontSize: 11,
  lineHeight: "14px",
  color: colors.muted,
  whiteSpace: "nowrap" as const,
};

const rowCellStyle = {
  padding: "8px 0",
  borderBottom: `1px solid ${colors.border}`,
  fontSize: 13,
  lineHeight: "18px",
  color: colors.text,
};

const numericCellStyle = {
  ...rowCellStyle,
  textAlign: "right" as const,
  whiteSpace: "nowrap" as const,
};

const { format: formatCount } = new Intl.NumberFormat("en-US");

const { format: formatCompact } = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

// Three significant digits keep a month's figure narrow enough for its bar.
const { format: formatBarValue } = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumSignificantDigits: 3,
});

function plural(count: number, word: string) {
  return count === 1 ? word : `${word}s`;
}

function countOf(count: number, word: string) {
  return `${formatCount(count)} ${plural(count, word)}`;
}

function SectionTitle(props: { children: React.ReactNode }) {
  // 35px of margin, plus the leading of the title, leave 40px between the
  // last line of a section and the title of the next.
  return <H2 style={{ margin: "35px 0 10px" }}>{props.children}</H2>;
}

function SectionLink(props: { href: string; children: React.ReactNode }) {
  return (
    <Text style={{ margin: "10px 0 0", fontSize: 13, lineHeight: "20px" }}>
      <Link href={props.href}>{props.children} →</Link>
    </Text>
  );
}

type Stat = {
  value: string;
  /** The trend, next to the figure. */
  delta?: React.ReactNode;
  label: string;
  detail?: React.ReactNode;
};

/**
 * Figures two by two, each with its trend, its label and a detail line, in the
 * brand color so the top of the report is not a column of grey text.
 */
function StatGrid(props: { stats: Stat[]; style?: React.CSSProperties }) {
  const rows = chunk(props.stats, 2);
  return (
    <Table style={props.style}>
      {rows.map((row, rowIndex) => (
        <tr key={rowIndex}>
          {row.map((stat, index) => (
            <td
              key={stat.label}
              width={row.length === 1 ? "100%" : "50%"}
              style={{
                verticalAlign: "top",
                // Space between rows only: below the last, the next
                // section sets its own.
                paddingBottom: rowIndex < rows.length - 1 ? 14 : 0,
                paddingLeft: index === 0 ? 0 : 16,
                paddingRight: 8,
                borderLeft:
                  index === 0 ? undefined : `1px solid ${colors.violetBorder}`,
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  lineHeight: "34px",
                  fontWeight: 600,
                  color: colors.violetText,
                }}
              >
                {stat.value}
                {stat.delta}
              </div>
              <div
                style={{
                  fontSize: 13,
                  lineHeight: "18px",
                  color: colors.text,
                }}
              >
                {stat.label}
              </div>
              {stat.detail ? (
                <div
                  style={{
                    marginTop: 2,
                    fontSize: 12,
                    lineHeight: "17px",
                    color: colors.muted,
                  }}
                >
                  {stat.detail}
                </div>
              ) : null}
            </td>
          ))}
        </tr>
      ))}
    </Table>
  );
}

/** Screenshots of each month of the term, the months to come projected. */
function MonthlyBars(props: { months: Month[] }) {
  const height = 72;
  const max = Math.max(1, ...props.months.map((month) => month.screenshots));
  return (
    <Table style={{ marginTop: 16 }}>
      <tr>
        {props.months.map((month) => (
          <td
            key={month.startsAt}
            height={height + 17}
            style={{
              verticalAlign: "bottom",
              padding: "0 2px",
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <div
              style={{
                ...axisLabelStyle,
                fontSize: 10,
                textAlign: "center",
                paddingBottom: 3,
                color: month.projected ? colors.muted : colors.text,
              }}
            >
              {formatBarValue(month.screenshots)}
            </div>
            <div
              style={{
                height: Math.max(
                  2,
                  Math.round((month.screenshots / max) * height),
                ),
                borderRadius: "2px 2px 0 0",
                backgroundColor: month.projected
                  ? colors.violetLight
                  : colors.violet,
              }}
            />
          </td>
        ))}
      </tr>
      <tr>
        {props.months.map((month) => (
          <td
            key={month.startsAt}
            style={{
              ...axisLabelStyle,
              // Twelve dates do not fit a phone's width on one line each: the
              // day goes under the month rather than widening the email.
              whiteSpace: "normal",
              textAlign: "center",
              paddingTop: 4,
            }}
          >
            {formatDate(new Date(month.startsAt), "monthDay")}
          </td>
        ))}
      </tr>
    </Table>
  );
}

function BuildNameTable(props: {
  rows: { label: string; current: number; previous: number }[];
}) {
  const headStyle = {
    ...axisLabelStyle,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    paddingBottom: 6,
    borderBottom: `1px solid ${colors.border}`,
  };
  return (
    <Table style={{ marginTop: 20 }}>
      <tr>
        <td style={headStyle}>Build name</td>
        <td style={{ ...headStyle, textAlign: "right" }}>Screenshots</td>
        <td style={{ ...headStyle, textAlign: "right" }}>vs last month</td>
      </tr>
      {props.rows.map((row) => (
        <tr key={row.label}>
          <td style={rowCellStyle}>{row.label}</td>
          <td style={{ ...rowCellStyle, textAlign: "right" }}>
            {formatCompact(row.current)}
          </td>
          <td style={numericCellStyle}>
            {row.previous === 0 ? (
              <NewPill />
            ) : (
              <Delta current={row.current} previous={row.previous} />
            )}
          </td>
        </tr>
      ))}
    </Table>
  );
}

function Delta(props: {
  current: number;
  previous: number;
  increaseIsBad?: boolean;
  suffix?: string;
}) {
  const { current, previous, suffix = "" } = props;
  const change = current - previous;
  if (change === 0) {
    return (
      <Pill color={colors.muted} background={colors.track}>
        same as last month
      </Pill>
    );
  }
  // A raw difference reads well on small counts, a share on large ones, as
  // long as the share does not round to nothing.
  const share = Math.abs(Math.round((change / previous) * 100));
  const value =
    previous >= 20 && share > 0 ? `${share}%` : String(Math.abs(change));
  const [color, background] = props.increaseIsBad
    ? change > 0
      ? [colors.overageText, colors.overagePill]
      : [colors.success, colors.successTint]
    : [colors.muted, colors.track];
  return (
    <Pill color={color} background={background}>
      {change > 0 ? "▲" : "▼"} {value}
      {suffix}
    </Pill>
  );
}

/** A layout table, the one structure every email client renders. */
function Table(props: {
  style?: React.CSSProperties | undefined;
  children: React.ReactNode;
}) {
  return (
    <table
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      role="presentation"
      style={props.style}
    >
      <tbody>{props.children}</tbody>
    </table>
  );
}

function NewPill() {
  return (
    <Pill color={colors.newText} background={colors.newTint}>
      New
    </Pill>
  );
}

function Pill(props: {
  color: string;
  background: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        marginLeft: 8,
        padding: "1px 7px",
        borderRadius: 5,
        fontSize: 12,
        lineHeight: "18px",
        fontWeight: 500,
        verticalAlign: "middle",
        whiteSpace: "nowrap",
        color: props.color,
        backgroundColor: props.background,
      }}
    >
      {props.children}
    </span>
  );
}

/** Where the term of an annual plan stands, and the overage it heads to. */
function AnnualPlan(props: { report: MonthlyReportData }) {
  const { report } = props;
  const termEndsAt = new Date(report.termEndsAt);
  const used = sumBy(
    report.months.filter((month) => !month.projected),
    "screenshots",
  );
  const projected = sumBy(report.months, "screenshots");
  const usedPct = Math.round((used / report.includedScreenshots) * 100);
  const usageHref = new URL(`/${report.accountSlug}/settings/billing`, baseUrl)
    .href;
  return (
    <>
      <SectionTitle>Annual plan</SectionTitle>
      <Paragraph style={{ margin: "0 0 12px" }}>
        {formatCompact(used)} screenshots so far this term,{" "}
        <strong>{usedPct}%</strong> of your plan.
      </Paragraph>
      <QuotaGauge
        used={used}
        projected={projected}
        included={report.includedScreenshots}
        startLabel={formatDate(new Date(report.termStartsAt), "date")}
        endLabel={formatDate(termEndsAt, "date")}
      />
      <OverageNote
        current={report.currentOverageCost}
        projected={report.projectedOverageCost}
        blockingSpendLimit={report.blockingSpendLimit}
        currency={report.currency}
        renews={report.renews}
        termEndsAt={termEndsAt}
      />
      <SectionLink href={usageHref}>See usage details</SectionLink>
    </>
  );
}

/** Below one unit of currency, an amount is not worth stating. */
function getAmountWorthStating(amount: number | null) {
  return amount !== null && amount >= 1 ? amount : null;
}

function OverageNote(props: {
  current: number;
  projected: number | null;
  blockingSpendLimit: number | null;
  currency: string;
  renews: boolean;
  termEndsAt: Date;
}) {
  const current = getAmountWorthStating(props.current);
  const projected = getAmountWorthStating(props.projected);
  if (current === null && projected === null) {
    return null;
  }
  const format = (value: number) => formatAmount(value, props.currency);
  const date = formatDate(props.termEndsAt, "longDate");
  const when = props.renews ? "at renewal" : "when the subscription ends";
  const { blockingSpendLimit } = props;
  const blocked =
    blockingSpendLimit !== null &&
    projected !== null &&
    projected > blockingSpendLimit;
  const getOverageSentence = () => {
    if (blocked) {
      return `At this pace, your ${format(blockingSpendLimit)} spend limit is reached before ${date}, and new builds will be refused from then on.`;
    }
    if (current === null) {
      invariant(projected !== null, "an overage note has an amount");
      return `At this pace, about ${format(projected)} of overage ${when}, on ${date}.`;
    }
    if (projected === null) {
      return `${format(current)} of overage so far, billed ${when}, on ${date}.`;
    }
    return `${format(current)} of overage so far, and at this pace about ${format(projected)} ${when}, on ${date}.`;
  };
  return (
    <Table style={{ marginTop: 20 }}>
      <tr>
        <td
          style={{
            borderLeft: `3px solid ${colors.overage}`,
            backgroundColor: colors.overageTint,
            borderRadius: "0 6px 6px 0",
            padding: "10px 14px",
            fontSize: 13,
            lineHeight: "20px",
            color: colors.text,
          }}
        >
          <strong style={{ color: colors.overageText }}>
            {getOverageSentence()}
          </strong>
          {blocked ? (
            <>
              {" "}
              You can raise it in your billing settings, or commit to a larger
              plan: reply to this email to discuss it.
            </>
          ) : props.renews ? (
            <>
              {" "}
              You can commit to a larger plan to lower this amount: reply to
              this email to discuss it.
            </>
          ) : null}
        </td>
      </tr>
    </Table>
  );
}

/**
 * The term in one bar, from its start to its end: what is used, what is
 * projected, and where the plan ends. Drawn with table cells, the one layout
 * every email client renders. The legend lists the segments the bar shows.
 */
function QuotaGauge(props: {
  used: number;
  projected: number;
  included: number;
  startLabel: string;
  endLabel: string;
}) {
  const { used, projected, included } = props;
  const scale = Math.max(projected, included);
  const pct = (value: number) => (value / scale) * 100;
  const segments = [
    { label: "Used", value: Math.min(used, included), color: colors.violet },
    {
      label: "Used beyond the plan",
      value: Math.max(0, used - included),
      color: colors.overage,
    },
    {
      label: "Projected",
      value: Math.max(0, Math.min(projected, included) - used),
      color: colors.violetLight,
    },
    {
      label: "Projected beyond the plan",
      value: Math.max(0, projected - Math.max(used, included)),
      color: colors.overageLight,
    },
  ].filter((segment) => segment.value > 0);
  const track = scale - projected;
  const includedPct = pct(included);
  // Close to the left edge, the plan label goes after its marker so it does
  // not run into the used label.
  const planLabelAfterMarker = includedPct < 40;

  const planLabel = <>Plan {formatCompact(included)}</>;

  return (
    <>
      <Table>
        <tr>
          <td style={{ ...axisLabelStyle, paddingBottom: 4 }}>
            {props.startLabel}
          </td>
          <td
            style={{
              ...axisLabelStyle,
              paddingBottom: 4,
              textAlign: "right",
            }}
          >
            {props.endLabel}
          </td>
        </tr>
      </Table>
      <Table style={{ borderRadius: 5, overflow: "hidden" }}>
        <tr>
          {[
            ...segments,
            ...(track > 0
              ? [{ label: "track", value: track, color: colors.track }]
              : []),
          ].map((segment) => (
            <td
              key={segment.label}
              width={`${pct(segment.value)}%`}
              height={10}
              style={{
                backgroundColor: segment.color,
                fontSize: 0,
                lineHeight: 0,
              }}
            >
              &nbsp;
            </td>
          ))}
        </tr>
      </Table>
      <Table>
        <tr>
          <td
            width={`${includedPct}%`}
            style={{
              borderRight: `2px solid ${colors.text}`,
              paddingTop: 4,
              paddingRight: 4,
            }}
          >
            <Table>
              <tr>
                <td style={{ ...axisLabelStyle, color: colors.text }}>
                  <strong>{formatCompact(used)}</strong> used
                </td>
                {planLabelAfterMarker ? null : (
                  <td style={{ ...axisLabelStyle, textAlign: "right" }}>
                    {planLabel}
                  </td>
                )}
              </tr>
            </Table>
          </td>
          {projected > included ? (
            <td style={{ paddingTop: 4 }}>
              <Table>
                <tr>
                  {planLabelAfterMarker ? (
                    <td style={{ ...axisLabelStyle, paddingLeft: 4 }}>
                      {planLabel}
                    </td>
                  ) : null}
                  <td
                    style={{
                      ...axisLabelStyle,
                      textAlign: "right",
                      color: colors.overageText,
                    }}
                  >
                    <strong>{formatCompact(projected)}</strong> projected
                  </td>
                </tr>
              </Table>
            </td>
          ) : null}
        </tr>
      </Table>
      <Text
        style={{
          margin: "8px 0 0",
          fontSize: 12,
          lineHeight: "18px",
          color: colors.muted,
        }}
      >
        {segments.map((segment) => (
          <span
            key={segment.label}
            style={{ marginRight: 14, whiteSpace: "nowrap" }}
          >
            <span
              style={{
                display: "inline-block",
                width: 9,
                height: 9,
                borderRadius: 2,
                backgroundColor: segment.color,
                verticalAlign: "-1px",
                marginRight: 5,
              }}
            />
            {segment.label}
          </span>
        ))}
      </Text>
    </>
  );
}
