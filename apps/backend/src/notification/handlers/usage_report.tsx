import { Section } from "react-email";
import { z } from "zod";

import config from "@/config";

import {
  Button,
  EmailLayout,
  H1,
  H2,
  Hi,
  Paragraph,
  Signature,
} from "../../email/components";
import { defineNotificationHandler } from "../workflow-types";

const baseUrl = config.get("server.url");

// Radix violet and orange, the scales the app charts are drawn with.
const colors = {
  included: "#6e56cf",
  includedProjected: "#e1d9ff",
  includedProjectedBorder: "#aa99ec",
  overage: "#f76b15",
  overageProjected: "#ffdcc3",
  overageProjectedBorder: "#f5ae73",
  track: "#f4f4f5",
  muted: "#71717a",
};

const MonthSchema = z.object({
  /** First day of the month of the term, as an ISO date. */
  startsAt: z.string(),
  screenshots: z.number(),
  /** Whether the month is still to come, and its count an estimate. */
  projected: z.boolean(),
});

export const handler = defineNotificationHandler({
  type: "usage_report",
  category: "usage",
  schema: z.object({
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
  }),
  previewData: {
    accountName: "Acme",
    accountSlug: "acme",
    currency: "eur",
    includedScreenshots: 1_200_000,
    projectedOverageCost: 451.5,
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
      ["2026-10-15", 136_000, true],
      ["2026-11-15", 136_000, true],
      ["2026-12-15", 136_000, true],
    ].map(([startsAt, screenshots, projected]) => ({
      startsAt: startsAt as string,
      screenshots: screenshots as number,
      projected: Boolean(projected),
    })),
  },
  // Annual overage is invoiced once, when the term ends, so a team that does
  // not watch its usage meets it for the first time on that invoice. The report
  // shows where the term is heading while there is still time to act on it,
  // in screenshots for whoever tunes the test suite and in money for whoever
  // pays.
  email: (props) => {
    const { ctx, months, includedScreenshots, currency } = props;
    const accountName = props.accountName || props.accountSlug;

    const formatCount = (value: number) =>
      new Intl.NumberFormat("en-US").format(Math.round(value));
    const formatCompact = (value: number) =>
      new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value);
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

    const used = sum(months.filter((m) => !m.projected));
    const projected = sum(months);
    const elapsedMonths = months.filter((m) => !m.projected).length;
    const usedRatio = used / includedScreenshots;
    const projectedOverage = Math.max(0, projected - includedScreenshots);
    const { projectedOverageCost } = props;
    const exhaustedAt = getQuotaExhaustionDate(months, includedScreenshots);
    const remaining = Math.max(0, includedScreenshots - used);

    const settingsHref = new URL(`/${props.accountSlug}/settings`, baseUrl)
      .href;

    const summary = (() => {
      if (projectedOverage === 0) {
        return (
          <Paragraph>
            At your current pace, your team will use about{" "}
            <strong>{formatCount(projected)} screenshots</strong> by the end of
            its term on {formatDate(props.termEndsAt)}, which{" "}
            <strong>stays within your plan</strong>. Nothing beyond your
            subscription should be billed at renewal.
          </Paragraph>
        );
      }
      return (
        <>
          <Paragraph>
            {remaining > 0 && exhaustedAt ? (
              <>
                Your team has{" "}
                <strong>{formatCount(remaining)} screenshots left</strong> in
                its plan. At your current pace, they will run out around{" "}
                <strong>{formatDate(exhaustedAt)}</strong>
              </>
            ) : (
              <>
                Your team has <strong>used every screenshot</strong> its plan
                includes for this term
              </>
            )}
            , and the term would end with about{" "}
            <strong>
              {formatCount(projectedOverage)} additional screenshots
            </strong>
            .
          </Paragraph>
          <Paragraph>
            Your builds keep running beyond the plan. On an annual plan, the
            overage is <strong>billed once, when the term ends</strong> on{" "}
            {formatDate(props.termEndsAt)}. At this pace, that would be an
            estimated <strong>{formatAmount(projectedOverageCost)}</strong>.
          </Paragraph>
        </>
      );
    })();

    return {
      subject: `${accountName} has used ${Math.round(usedRatio * 100)}% of its annual plan`,
      body: (
        <EmailLayout
          preview={`${formatCount(used)} of ${formatCount(includedScreenshots)} screenshots used, ${elapsedMonths} months into the term.`}
          preferencesUrl={ctx.preferencesUrl}
        >
          <H1>Your monthly usage report</H1>
          <Hi name={ctx.user.name} />
          <Paragraph>
            Here is where <strong>{accountName}</strong> stands, {elapsedMonths}{" "}
            months into its annual plan.
          </Paragraph>

          <Stats
            items={[
              {
                label: "Used this term",
                value: formatCompact(used),
                detail: `of ${formatCompact(includedScreenshots)} included`,
              },
              {
                label: "Term elapsed",
                value: `${elapsedMonths} of ${months.length}`,
                detail: "months",
              },
              {
                label: "Projected at renewal",
                value: formatCompact(projected),
                detail:
                  projectedOverage > 0
                    ? `${formatAmount(projectedOverageCost)} overage`
                    : "within your plan",
                highlight: projectedOverage > 0,
              },
            ]}
          />

          <QuotaGauge
            used={used}
            projected={projected}
            included={includedScreenshots}
            formatCompact={formatCompact}
          />

          {summary}

          <H2>Screenshots per month</H2>
          <MonthlyChart
            months={months}
            included={includedScreenshots}
            formatCompact={formatCompact}
          />

          <Paragraph>
            The months to come are projected from the average of the last three.
            Usage is counted across every project of the team.
          </Paragraph>

          <Section className="my-6 text-center">
            <Button href={settingsHref}>View usage</Button>
          </Section>
          <Paragraph>
            If you would like to adjust your plan before the term ends, or have
            any questions about these numbers, simply reply to this email.
          </Paragraph>
          <Signature />
        </EmailLayout>
      ),
    };
  },
});

type Month = z.infer<typeof MonthSchema>;

function sum(months: Month[]) {
  return months.reduce((total, month) => total + month.screenshots, 0);
}

/**
 * The day the cumulative usage reaches the included screenshots, assuming
 * usage is spread evenly within a month. Null when it never does.
 */
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

function Stats(props: {
  items: {
    label: string;
    value: string;
    detail: string;
    highlight?: boolean;
  }[];
}) {
  return (
    <table
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      role="presentation"
      style={{ marginTop: 8, marginBottom: 20 }}
    >
      <tbody>
        <tr>
          {props.items.map((item, index) => (
            <td
              key={item.label}
              width={`${100 / props.items.length}%`}
              style={{
                verticalAlign: "top",
                paddingLeft: index === 0 ? 0 : 16,
                borderLeft: index === 0 ? undefined : "1px solid #e4e4e7",
              }}
            >
              <div style={{ fontSize: 12, color: colors.muted }}>
                {item.label}
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  lineHeight: "32px",
                  color: "#09090b",
                }}
              >
                {item.value}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: item.highlight ? "#cc4e00" : colors.muted,
                  fontWeight: item.highlight ? 600 : 400,
                }}
              >
                {item.detail}
              </div>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Horizontal bar of the whole term: what is used, what is projected, and where
 * the plan ends. Drawn with table cells, the one layout every client renders.
 */
function QuotaGauge(props: {
  used: number;
  projected: number;
  included: number;
  formatCompact: (value: number) => string;
}) {
  const { used, projected, included } = props;
  const scale = Math.max(projected, included);
  const pct = (value: number) => (value / scale) * 100;

  const segments = [
    { value: Math.min(used, included), color: colors.included },
    { value: Math.max(0, used - included), color: colors.overage },
    {
      value: Math.max(0, Math.min(projected, included) - used),
      color: colors.includedProjected,
    },
    {
      value: Math.max(0, projected - Math.max(used, included)),
      color: colors.overageProjected,
    },
    { value: Math.max(0, scale - projected), color: colors.track },
  ].filter((segment) => segment.value > 0);

  const includedPct = pct(included);

  return (
    <Section className="mb-2">
      <table
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        role="presentation"
        style={{ borderRadius: 4, overflow: "hidden" }}
      >
        <tbody>
          <tr>
            {segments.map((segment, index) => (
              <td
                key={index}
                width={`${pct(segment.value)}%`}
                height={12}
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
                borderRight: "2px solid #09090b",
                fontSize: 11,
                lineHeight: "14px",
                color: colors.muted,
                textAlign: "right",
                paddingRight: 4,
                paddingTop: 4,
                whiteSpace: "nowrap",
              }}
            >
              Plan: {props.formatCompact(included)}
            </td>
            {includedPct < 100 ? (
              <td
                style={{
                  fontSize: 11,
                  color: colors.muted,
                  textAlign: "right",
                  paddingTop: 4,
                }}
              >
                {props.formatCompact(projected)}
              </td>
            ) : null}
          </tr>
        </tbody>
      </table>
      <Legend overage={projected > included} />
    </Section>
  );
}

function Legend(props: { overage: boolean }) {
  const items = [
    { label: "Included", color: colors.included },
    ...(props.overage ? [{ label: "Overage", color: colors.overage }] : []),
    {
      label: "Projected",
      color: colors.includedProjected,
      border: colors.includedProjectedBorder,
    },
  ];
  return (
    <table cellPadding={0} cellSpacing={0} role="presentation">
      <tbody>
        <tr>
          {items.map((item) => (
            <td
              key={item.label}
              style={{
                paddingTop: 10,
                paddingRight: 16,
                fontSize: 12,
                color: colors.muted,
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  backgroundColor: item.color,
                  border: item.border ? `1px dashed ${item.border}` : undefined,
                  boxSizing: "border-box",
                  verticalAlign: "-1px",
                  marginRight: 6,
                }}
              />
              {item.label}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

const CHART_HEIGHT = 120;

/**
 * One bar per month of the term, split where the cumulative usage crosses the
 * plan, so the month the overage starts reads at a glance.
 */
function MonthlyChart(props: {
  months: Month[];
  included: number;
  formatCompact: (value: number) => string;
}) {
  const { months, included } = props;
  const max = Math.max(...months.map((m) => m.screenshots));
  const formatMonth = (value: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      timeZone: "UTC",
    }).format(new Date(value));

  let cumulative = 0;
  const bars = months.map((month) => {
    const withinPlan = Math.max(
      0,
      Math.min(month.screenshots, included - cumulative),
    );
    cumulative += month.screenshots;
    return {
      ...month,
      withinPlan,
      overage: month.screenshots - withinPlan,
    };
  });

  const toHeight = (value: number) => Math.round((value / max) * CHART_HEIGHT);

  return (
    <table
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      role="presentation"
      style={{ marginBottom: 8, tableLayout: "fixed" }}
    >
      <tbody>
        <tr>
          {bars.map((bar) => {
            const overageHeight = toHeight(bar.overage);
            const withinHeight = toHeight(bar.withinPlan);
            const style = bar.projected
              ? {
                  overage: {
                    backgroundColor: colors.overageProjected,
                    border: `1px dashed ${colors.overageProjectedBorder}`,
                  },
                  within: {
                    backgroundColor: colors.includedProjected,
                    border: `1px dashed ${colors.includedProjectedBorder}`,
                  },
                }
              : {
                  overage: { backgroundColor: colors.overage },
                  within: { backgroundColor: colors.included },
                };
            return (
              <td
                key={bar.startsAt}
                height={CHART_HEIGHT + 18}
                style={{
                  verticalAlign: "bottom",
                  paddingLeft: 3,
                  paddingRight: 3,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    lineHeight: "14px",
                    color: colors.muted,
                    textAlign: "center",
                    paddingBottom: 4,
                  }}
                >
                  {props.formatCompact(bar.screenshots)}
                </div>
                {overageHeight > 0 ? (
                  <div
                    style={{
                      ...style.overage,
                      height: overageHeight,
                      boxSizing: "border-box",
                      borderRadius: withinHeight > 0 ? "3px 3px 0 0" : 3,
                      borderBottom: withinHeight > 0 ? "none" : undefined,
                    }}
                  />
                ) : null}
                {withinHeight > 0 ? (
                  <div
                    style={{
                      ...style.within,
                      height: withinHeight,
                      boxSizing: "border-box",
                      borderRadius: overageHeight > 0 ? 0 : "3px 3px 0 0",
                    }}
                  />
                ) : null}
              </td>
            );
          })}
        </tr>
        <tr>
          {bars.map((bar) => (
            <td
              key={bar.startsAt}
              style={{
                borderTop: "1px solid #e4e4e7",
                paddingTop: 6,
                fontSize: 11,
                color: bar.projected ? "#a1a1aa" : colors.muted,
                textAlign: "center",
              }}
            >
              {formatMonth(bar.startsAt)}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}
