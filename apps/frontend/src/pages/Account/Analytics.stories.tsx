import type { Meta, StoryObj } from "@storybook/react-vite";

import { TimeSeriesGroupBy } from "@/gql/graphql";

import { AnalyticsDashboard } from "./Analytics";

const PROJECTS = [
  { __typename: "Project" as const, id: "1", name: "argos" },
  { __typename: "Project" as const, id: "2", name: "argos-ci.com" },
  { __typename: "Project" as const, id: "3", name: "argos-javascript" },
  { __typename: "Project" as const, id: "4", name: "storybook" },
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

  // Builds per project per bucket, roughly matching real relative volumes.
  const buildWeights: Record<string, number> = {
    "1": 6,
    "2": 2,
    "3": 3,
    "4": 2,
  };
  // Screenshots per build for each project.
  const screenshotWeights: Record<string, number> = {
    "1": 42,
    "2": 27,
    "3": 31,
    "4": 55,
  };

  for (let i = 0; i < POINTS; i++) {
    const ts = START + i * DAY;
    // Deterministic wave so the charts look alive without randomness.
    const wave = 1 + Math.sin(i / 3) * 0.5;
    const buildCounts: Record<string, number> = {};
    const screenshotCounts: Record<string, number> = {};
    let total = 0;
    let sTotal = 0;
    for (const project of PROJECTS) {
      const builds = Math.round(buildWeights[project.id]! * wave) + 1;
      const screenshots = builds * screenshotWeights[project.id]!;
      buildCounts[project.id] = builds;
      screenshotCounts[project.id] = screenshots;
      total += builds;
      sTotal += screenshots;
      buildsAll.projects[project.id] =
        (buildsAll.projects[project.id] ?? 0) + builds;
      screenshotsAll.projects[project.id] =
        (screenshotsAll.projects[project.id] ?? 0) + screenshots;
    }
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
      projects: buildCounts,
      changesDetected,
      noChanges,
      accepted,
      rejected,
    });
    buildsAll.total += total;
    buildsAll.changesDetected += changesDetected;
    buildsAll.noChanges += noChanges;
    buildsAll.accepted += accepted;
    buildsAll.rejected += rejected;

    screenshotsSeries.push({
      __typename: "AccountMetricDataPoint" as const,
      ts,
      total: sTotal,
      projects: screenshotCounts,
    });
    screenshotsAll.total += sTotal;
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
