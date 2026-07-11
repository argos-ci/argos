import type { Meta, StoryObj } from "@storybook/react-vite";

import { TimeSeriesGroupBy } from "@/gql/graphql";

import { AnalyticsDashboard } from "./Analytics";

const PROJECTS = [
  { __typename: "Project" as const, id: "1", name: "website" },
  { __typename: "Project" as const, id: "2", name: "design-system" },
];

const DAY = 24 * 60 * 60 * 1000;
const START = new Date("2026-06-01T00:00:00Z").getTime();
const POINTS = 30;

function buildFixture() {
  const buildsSeries = [];
  const screenshotsSeries = [];
  const buildsAll = {
    __typename: "AccountBuildsMetricData" as const,
    total: 0,
    projects: {} as Record<string, number>,
    changesDetected: 0,
    noChanges: 0,
    accepted: 0,
    rejected: 0,
  };
  const screenshotsAll = {
    __typename: "AccountMetricData" as const,
    total: 0,
    projects: {} as Record<string, number>,
  };

  for (let i = 0; i < POINTS; i++) {
    const ts = START + i * DAY;
    // Deterministic wave so the charts look alive without randomness.
    const wave = 1 + Math.sin(i / 3) * 0.5;
    const p1 = Math.round(6 * wave) + 2;
    const p2 = Math.round(3 * wave) + 1;
    const total = p1 + p2;
    const changesDetected = Math.round(total * 0.35);
    const noChanges = total - changesDetected;
    const accepted = Math.round(changesDetected * 0.7);
    const rejected = Math.max(
      0,
      changesDetected - accepted - (i % 3 === 0 ? 1 : 0),
    );

    buildsSeries.push({
      __typename: "AccountBuildsMetricDataPoint" as const,
      ts,
      total,
      projects: { "1": p1, "2": p2 },
      changesDetected,
      noChanges,
      accepted,
      rejected,
    });
    buildsAll.total += total;
    buildsAll.projects["1"] = (buildsAll.projects["1"] ?? 0) + p1;
    buildsAll.projects["2"] = (buildsAll.projects["2"] ?? 0) + p2;
    buildsAll.changesDetected += changesDetected;
    buildsAll.noChanges += noChanges;
    buildsAll.accepted += accepted;
    buildsAll.rejected += rejected;

    const s1 = p1 * 42;
    const s2 = p2 * 27;
    const sTotal = s1 + s2;
    screenshotsSeries.push({
      __typename: "AccountMetricDataPoint" as const,
      ts,
      total: sTotal,
      projects: { "1": s1, "2": s2 },
    });
    screenshotsAll.total += sTotal;
    screenshotsAll.projects["1"] = (screenshotsAll.projects["1"] ?? 0) + s1;
    screenshotsAll.projects["2"] = (screenshotsAll.projects["2"] ?? 0) + s2;
  }

  return {
    __typename: "AccountMetrics" as const,
    builds: {
      __typename: "AccountBuildsMetrics" as const,
      all: buildsAll,
      series: buildsSeries,
      projects: PROJECTS,
    },
    screenshots: {
      __typename: "AccountScreenshotMetrics" as const,
      all: screenshotsAll,
      series: screenshotsSeries,
      projects: PROJECTS,
    },
  };
}

const meta: Meta<typeof AnalyticsDashboard> = {
  title: "Pages/AnalyticsDashboard",
  component: AnalyticsDashboard,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="bg-subtle min-h-screen p-10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    accountSlug: "acme",
    metrics: buildFixture(),
    from: new Date(START),
    to: new Date(START + POINTS * DAY),
    groupBy: TimeSeriesGroupBy.Day,
  },
};

export const Empty: Story = {
  args: {
    accountSlug: "acme",
    metrics: {
      __typename: "AccountMetrics",
      builds: {
        __typename: "AccountBuildsMetrics",
        all: {
          __typename: "AccountBuildsMetricData",
          total: 0,
          projects: {},
          changesDetected: 0,
          noChanges: 0,
          accepted: 0,
          rejected: 0,
        },
        series: [],
        projects: [],
      },
      screenshots: {
        __typename: "AccountScreenshotMetrics",
        all: { __typename: "AccountMetricData", total: 0, projects: {} },
        series: [],
        projects: [],
      },
    },
    from: new Date(START),
    to: new Date(START + POINTS * DAY),
    groupBy: TimeSeriesGroupBy.Day,
  },
};
