import { Section, Text } from "react-email";
import { z } from "zod";

import config from "@/config";

import { EmailLayout, H1, Link, Signature } from "../components";
import { defineEmailTemplate } from "../template";

const baseUrl = config.get("server.url");

// Radix violet, orange and slate, the scales the app is drawn with.
const colors = {
  text: "#09090b",
  muted: "#71717a",
  faint: "#a1a1aa",
  border: "#e4e4e7",
  violet: "#6e56cf",
  violetText: "#5746af",
  violetTint: "#f7f4ff",
  violetBorder: "#e4dcfd",
  violetLight: "#e1d9ff",
  overage: "#f76b15",
  overageText: "#cc4e00",
  overageTint: "#fff8f2",
  overageLight: "#ffdcc3",
  track: "#f1f1f3",
  success: "#218358",
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
  changesReviewed: z.object({
    current: z.number(),
    previous: z.number().nullable(),
  }),
  /** Tests that ran on the reference branch, and the ones new to it. */
  tests: z.object({ covered: z.number(), added: z.number() }),
  flakyTests: z.object({
    current: z.number(),
    previous: z.number().nullable(),
    top: z.array(
      z.object({
        name: z.string(),
        buildName: z.string(),
        flakiness: z.number(),
        url: z.string(),
      }),
    ),
  }),
  screenshots: z.object({
    /** The project and build name whose screenshots grew the most. */
    biggestIncrease: z
      .object({
        label: z.string(),
        screenshots: z.number(),
        previous: z.number(),
      })
      .nullable(),
  }),
});

export type MonthlyReportActivity = z.infer<typeof ActivitySchema>;

const UsageReportSchema = z.object({
  accountName: z.string().nullish(),
  accountSlug: z.string(),
  currency: z.enum(["usd", "eur"]),
  /** Screenshots the plan includes over the whole term. */
  includedScreenshots: z.number(),
  /** Overage the term would be billed at renewal, at the current pace. */
  projectedOverageCost: z.number(),
  termStartsAt: z.string(),
  termEndsAt: z.string(),
  /** Every month of the term, the ones to come included. */
  months: z.array(MonthSchema),
  activity: ActivitySchema,
  /** What shipped in Argos since the previous report, from its changelog. */
  news: z.array(
    z.object({
      title: z.string(),
      summary: z.string(),
      url: z.string(),
      publishedAt: z.string(),
    }),
  ),
  /** Turns the report off for this owner of this team, without signing in. */
  unsubscribeUrl: z.url(),
});

type UsageReportData = z.infer<typeof UsageReportSchema>;
type Month = UsageReportData["months"][number];

/**
 * The monthly report of a team on an annual plan: what Argos did for it over
 * the month, then where its plan stands. Annual overage is invoiced once, when
 * the term ends, so this is where a team that does not watch its usage sees
 * it coming.
 */
export const handler = defineEmailTemplate({
  type: "usage_report",
  schema: UsageReportSchema,
  previewData: {
    accountName: "Acme",
    accountSlug: "acme",
    currency: "eur",
    includedScreenshots: 1_200_000,
    projectedOverageCost: 468.75,
    termStartsAt: "2026-01-15",
    termEndsAt: "2027-01-15",
    months: [
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
    ].map(([startsAt, screenshots, projected]) => ({
      startsAt: startsAt as string,
      screenshots: screenshots as number,
      projected: Boolean(projected),
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
            url: "https://app.argos-ci.com/acme/web/tests/1",
          },
          {
            name: "Button / Loading",
            buildName: "storybook",
            flakiness: 0.48,
            url: "https://app.argos-ci.com/acme/web/tests/2",
          },
          {
            name: "dashboard › charts",
            buildName: "e2e",
            flakiness: 0.41,
            url: "https://app.argos-ci.com/acme/web/tests/3",
          },
        ],
      },
      screenshots: {
        biggestIncrease: {
          label: "web · e2e",
          screenshots: 71_000,
          previous: 52_000,
        },
      },
    },
    news: [
      {
        title: "Journeys",
        summary:
          "The build review unfolds the journey a screenshot belongs to as a strip of steps, so you see where a change sits in the checkout, the signup or the onboarding your test walked.",
        url: "https://argos-ci.com/changelog/2026-09-12-journeys",
        publishedAt: "2026-09-12T00:00:00.000Z",
      },
      {
        title: "Custom domains",
        summary:
          "Point your own domain at your production deployments with a single DNS record, and Argos issues and installs the TLS certificate automatically.",
        url: "https://argos-ci.com/changelog/2026-09-01-custom-domains",
        publishedAt: "2026-09-01T00:00:00.000Z",
      },
    ],
    unsubscribeUrl:
      "https://app.argos-ci.com/unsubscribe/monthly-report?token=xxx",
  },
  email: (props) => renderMonthlyReport(props),
});

function renderMonthlyReport(props: UsageReportData) {
  const { months, includedScreenshots, currency, projectedOverageCost } = props;
  const { activity } = props;
  const accountName = props.accountName || props.accountSlug;

  const formatCompact = (value: number) =>
    new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  const formatCount = (value: number) =>
    new Intl.NumberFormat("en-US").format(Math.round(value));
  const formatAmount = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  const formatDate = (value: string | Date) =>
    new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(value));
  const formatMonthDate = (value: string | Date) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(value));
  const formatShortDate = (value: string | Date) =>
    new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(value));

  const closed = months.filter((month) => !month.projected);
  const used = sum(closed);
  const projected = sum(months);
  const usedPct = Math.round((used / includedScreenshots) * 100);
  const elapsedPct = Math.round((closed.length / months.length) * 100);
  const exhaustedAt = getQuotaExhaustionDate(months, includedScreenshots);
  const overage = projected > includedScreenshots;
  const { biggestIncrease } = activity.screenshots;

  const usageHref = new URL(`/${props.accountSlug}/settings/billing`, baseUrl)
    .href;
  const testsHref = new URL(`/${props.accountSlug}/~/tests`, baseUrl).href;
  const analyticsHref = new URL(`/${props.accountSlug}/~/analytics`, baseUrl)
    .href;
  const period = `${formatShortDate(activity.from)} to ${formatDate(activity.to)}`;

  return {
    subject: `Your Argos monthly report for ${accountName}`,
    body: (
      <EmailLayout
        preview={`${formatCount(activity.pullRequests.checked)} pull requests checked, ${formatCount(activity.pullRequests.fixedAfterFlag)} fixed after a visual change was flagged.`}
      >
        <Text style={eyebrowStyle}>Monthly report · {period}</Text>
        <H1>{accountName}’s month on Argos</H1>

        <Hero
          stats={[
            {
              value: formatCount(activity.pullRequests.checked),
              label: "pull requests checked",
              detail: `${formatCount(activity.pullRequests.intermediateCommits)} intermediate commits along the way`,
            },
            {
              value: formatCount(activity.pullRequests.fixedAfterFlag),
              label: "fixed after Argos flagged a visual change",
            },
            {
              value: formatCount(activity.changesReviewed.current),
              label: "visual changes reviewed",
              detail: (
                <Delta
                  current={activity.changesReviewed.current}
                  previous={activity.changesReviewed.previous}
                />
              ),
            },
            {
              value: formatCount(activity.tests.covered),
              label: "tests covered",
              detail: `${formatCount(activity.tests.added)} new this month`,
            },
          ]}
        />
        <SectionLink href={analyticsHref}>See analytics</SectionLink>

        <SectionTitle>Test health</SectionTitle>
        <Text style={{ ...bodyStyle, margin: 0 }}>
          <strong>
            {formatCount(activity.flakyTests.current)} flaky tests
          </strong>{" "}
          this month{" "}
          <Delta
            current={activity.flakyTests.current}
            previous={activity.flakyTests.previous}
            tone="increaseIsBad"
          />
          . Their changes come back without a code change, and each one costs a
          review.
        </Text>
        {activity.flakyTests.top.length > 0 ? (
          <table
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            role="presentation"
            style={{ marginTop: 8 }}
          >
            <tbody>
              {activity.flakyTests.top.map((test) => (
                <tr key={test.url}>
                  <td style={rowCellStyle}>
                    <Link href={test.url}>{test.name}</Link>{" "}
                    <span style={{ color: colors.faint }}>
                      {test.buildName}
                    </span>
                  </td>
                  <td
                    style={{
                      ...rowCellStyle,
                      textAlign: "right",
                      whiteSpace: "nowrap",
                      paddingLeft: 12,
                      color: colors.overageText,
                    }}
                  >
                    {Math.round(test.flakiness * 100)}% flaky
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        <SectionLink href={testsHref}>See all tests</SectionLink>

        <SectionTitle>Usage</SectionTitle>
        <Text style={{ ...bodyStyle, margin: "0 0 12px" }}>
          <strong>{usedPct}%</strong> of your plan used ·{" "}
          <strong>{elapsedPct}%</strong> of the term elapsed.{" "}
          {overage ? (
            <>
              At this pace, the plan runs out around{" "}
              {exhaustedAt ? formatShortDate(exhaustedAt) : "renewal"}, and the
              term ends at about {formatCompact(projected)} screenshots,{" "}
              {formatRatio(projected / includedScreenshots)} your plan.
            </>
          ) : (
            <>
              On track to stay within your plan until renewal on{" "}
              {formatDate(props.termEndsAt)}.
            </>
          )}
        </Text>
        <QuotaGauge
          used={used}
          projected={projected}
          included={includedScreenshots}
          startLabel={formatMonthDate(props.termStartsAt)}
          endLabel={formatMonthDate(props.termEndsAt)}
          formatCompact={formatCompact}
        />
        <GaugeLegend
          usedOverage={used > includedScreenshots}
          projectedOverage={overage}
        />
        {overage ? (
          <OverageNote
            amount={formatAmount(projectedOverageCost)}
            renewal={formatDate(props.termEndsAt)}
          />
        ) : null}
        {biggestIncrease ? (
          <>
            <Text
              style={{
                margin: "24px 0 4px",
                fontSize: 13,
                lineHeight: "20px",
                fontWeight: 600,
                color: colors.text,
              }}
            >
              Biggest change this month
            </Text>
            <Text style={{ ...bodyStyle, margin: 0 }}>
              <strong>{biggestIncrease.label}</strong> used{" "}
              {formatCompact(biggestIncrease.screenshots)} screenshots,{" "}
              <span style={{ color: colors.overageText }}>
                +
                {formatCompact(
                  biggestIncrease.screenshots - biggestIncrease.previous,
                )}{" "}
                (+
                {Math.round(
                  ((biggestIncrease.screenshots - biggestIncrease.previous) /
                    biggestIncrease.previous) *
                    100,
                )}
                %)
              </span>{" "}
              compared with last month.
            </Text>
          </>
        ) : null}
        <SectionLink href={usageHref}>See usage details</SectionLink>

        {props.news.length > 0 ? (
          <>
            <SectionTitle>What’s new in Argos</SectionTitle>
            {props.news.map((item) => (
              <Text key={item.url} style={{ ...bodyStyle, margin: "0 0 12px" }}>
                <Link href={item.url}>
                  <strong>{item.title}</strong>
                </Link>
                <br />
                <span style={{ fontSize: 13, color: colors.muted }}>
                  {item.summary}
                </span>
              </Text>
            ))}
            <SectionLink href="https://argos-ci.com/changelog">
              See the changelog
            </SectionLink>
          </>
        ) : null}

        <Section style={{ marginTop: 32 }}>
          {overage ? null : (
            <Text style={{ ...bodyStyle, margin: "0 0 4px" }}>
              If your usage changes, reply to this email: we can adjust your
              plan before your term ends and help you avoid any overage.
            </Text>
          )}
          <Signature />
        </Section>
        <Text style={{ ...smallStyle, margin: "0 0 8px" }}>
          You receive this monthly report as an owner of {accountName}.{" "}
          <Link href={props.unsubscribeUrl}>Unsubscribe</Link>
        </Text>
      </EmailLayout>
    ),
  };
}

const eyebrowStyle = {
  margin: "24px 0 0",
  fontSize: 11,
  lineHeight: "16px",
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  color: colors.muted,
};

const bodyStyle = { fontSize: 14, lineHeight: "22px", color: colors.text };
const smallStyle = { fontSize: 12, lineHeight: "18px", color: colors.muted };
const rowCellStyle = {
  padding: "8px 0",
  borderBottom: `1px solid ${colors.border}`,
  fontSize: 13,
  lineHeight: "18px",
  color: colors.text,
};

function formatRatio(ratio: number) {
  return ratio >= 1.95
    ? `${Math.round(ratio * 10) / 10}×`.replace(".0×", "×")
    : `${Math.round((ratio - 1) * 100)}% above`;
}

function sum(months: Month[]) {
  return months.reduce((total, month) => total + month.screenshots, 0);
}

function getQuotaExhaustionDate(months: Month[], included: number) {
  let cumulative = 0;
  for (const [index, month] of months.entries()) {
    if (cumulative + month.screenshots >= included) {
      const start = new Date(month.startsAt).getTime();
      const next = months[index + 1];
      const end = next
        ? new Date(next.startsAt).getTime()
        : start + 30 * 24 * 3600 * 1000;
      const share = (included - cumulative) / month.screenshots;
      return new Date(start + (end - start) * share);
    }
    cumulative += month.screenshots;
  }
  return null;
}

function SectionTitle(props: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        margin: "32px 0 10px",
        fontSize: 15,
        lineHeight: "22px",
        fontWeight: 600,
        color: colors.text,
      }}
    >
      {props.children}
    </Text>
  );
}

function SectionLink(props: { href: string; children: React.ReactNode }) {
  return (
    <Text style={{ margin: "10px 0 0", fontSize: 13, lineHeight: "20px" }}>
      <Link href={props.href}>{props.children} →</Link>
    </Text>
  );
}

/**
 * The month at a glance: the figures that say what Argos did for the team, in
 * the brand color, so the top of the report is not a column of grey text.
 */
function Hero(props: {
  stats: { value: string; label: string; detail?: React.ReactNode }[];
}) {
  const rows: (typeof props.stats)[] = [];
  for (let index = 0; index < props.stats.length; index += 2) {
    rows.push(props.stats.slice(index, index + 2));
  }
  return (
    <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
      <tbody>
        <tr>
          <td
            style={{
              backgroundColor: colors.violetTint,
              border: `1px solid ${colors.violetBorder}`,
              borderRadius: 10,
              padding: "18px 20px 6px",
            }}
          >
            <table
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              role="presentation"
            >
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((stat, index) => (
                      <td
                        key={stat.label}
                        width="50%"
                        style={{
                          verticalAlign: "top",
                          paddingBottom: 14,
                          paddingLeft: index === 0 ? 0 : 16,
                          paddingRight: 8,
                          borderLeft:
                            index === 0
                              ? undefined
                              : `1px solid ${colors.violetBorder}`,
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
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function Delta(props: {
  current: number;
  previous: number | null;
  tone?: "increaseIsBad";
}) {
  const { current, previous } = props;
  if (previous === null) {
    return null;
  }
  const change = current - previous;
  if (change === 0) {
    return <span style={{ color: colors.muted }}>(same as last month)</span>;
  }
  // A raw difference reads well on small counts, a share on large ones.
  const value =
    previous >= 20
      ? `${Math.abs(Math.round((change / previous) * 100))}%`
      : String(Math.abs(change));
  const color =
    props.tone === "increaseIsBad"
      ? change > 0
        ? colors.overageText
        : colors.success
      : colors.muted;
  return (
    <span style={{ color }}>
      {change > 0 ? "▲" : "▼"} {value} vs last month
    </span>
  );
}

function GaugeLegend(props: {
  usedOverage: boolean;
  projectedOverage: boolean;
}) {
  const items = [
    { label: "Used", color: colors.violet },
    ...(props.usedOverage
      ? [{ label: "Used beyond the plan", color: colors.overage }]
      : []),
    { label: "Projected", color: colors.violetLight },
    ...(props.projectedOverage
      ? [{ label: "Projected beyond the plan", color: colors.overageLight }]
      : []),
  ];
  return (
    <Text style={{ ...smallStyle, margin: "8px 0 0" }}>
      {items.map((item) => (
        <span
          key={item.label}
          style={{ marginRight: 14, whiteSpace: "nowrap" }}
        >
          <span
            style={{
              display: "inline-block",
              width: 9,
              height: 9,
              borderRadius: 2,
              backgroundColor: item.color,
              verticalAlign: "-1px",
              marginRight: 5,
            }}
          />
          {item.label}
        </span>
      ))}
    </Text>
  );
}

function OverageNote(props: { amount: string; renewal: string }) {
  return (
    <table
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      role="presentation"
      style={{ marginTop: 20 }}
    >
      <tbody>
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
              About {props.amount} of overage will be billed at renewal, on{" "}
              {props.renewal}.
            </strong>{" "}
            You can commit to a larger plan to lower this amount: reply to this
            email to discuss it.
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/**
 * The term in one bar, from its start to its renewal: what is used, what is
 * projected, and where the plan ends. Drawn with table cells, the one layout
 * every email client renders.
 */
function QuotaGauge(props: {
  used: number;
  projected: number;
  included: number;
  startLabel: string;
  endLabel: string;
  formatCompact: (value: number) => string;
}) {
  const { used, projected, included } = props;
  const scale = Math.max(projected, included);
  const pct = (value: number) => (value / scale) * 100;
  const segments = [
    { value: Math.min(used, included), color: colors.violet },
    { value: Math.max(0, used - included), color: colors.overage },
    {
      value: Math.max(0, Math.min(projected, included) - used),
      color: colors.violetLight,
    },
    {
      value: Math.max(0, projected - Math.max(used, included)),
      color: colors.overageLight,
    },
    { value: Math.max(0, scale - projected), color: colors.track },
  ].filter((segment) => segment.value > 0);
  const includedPct = pct(included);
  const overage = projected > included;
  // Close to the left edge, the plan label goes after its marker so it does
  // not run into the used label.
  const planLabelAfterMarker = includedPct < 40;

  const labelStyle = {
    fontSize: 11,
    lineHeight: "14px",
    color: colors.muted,
    whiteSpace: "nowrap" as const,
  };
  const planLabel = <>Plan {props.formatCompact(included)}</>;

  return (
    <>
      <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
        <tbody>
          <tr>
            <td style={{ ...labelStyle, paddingBottom: 4 }}>
              {props.startLabel}
            </td>
            <td style={{ ...labelStyle, paddingBottom: 4, textAlign: "right" }}>
              {props.endLabel}
            </td>
          </tr>
        </tbody>
      </table>
      <table
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        role="presentation"
        style={{ borderRadius: 5, overflow: "hidden" }}
      >
        <tbody>
          <tr>
            {segments.map((segment, index) => (
              <td
                key={index}
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
        </tbody>
      </table>
      <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
        <tbody>
          <tr>
            <td
              width={`${includedPct}%`}
              style={{
                borderRight: `2px solid ${colors.text}`,
                paddingTop: 4,
                paddingRight: 4,
              }}
            >
              <table
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                role="presentation"
              >
                <tbody>
                  <tr>
                    <td style={{ ...labelStyle, color: colors.text }}>
                      <strong>{props.formatCompact(used)}</strong> used
                    </td>
                    {planLabelAfterMarker ? null : (
                      <td style={{ ...labelStyle, textAlign: "right" }}>
                        {planLabel}
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </td>
            {includedPct < 100 ? (
              <td style={{ paddingTop: 4 }}>
                <table
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  role="presentation"
                >
                  <tbody>
                    <tr>
                      {planLabelAfterMarker ? (
                        <td style={{ ...labelStyle, paddingLeft: 4 }}>
                          {planLabel}
                        </td>
                      ) : null}
                      {overage ? (
                        <td
                          style={{
                            ...labelStyle,
                            textAlign: "right",
                            color: colors.overageText,
                          }}
                        >
                          <strong>{props.formatCompact(projected)}</strong>{" "}
                          projected
                        </td>
                      ) : null}
                    </tr>
                  </tbody>
                </table>
              </td>
            ) : null}
          </tr>
        </tbody>
      </table>
    </>
  );
}
