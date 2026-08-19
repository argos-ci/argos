import { invariant } from "@argos/util/invariant";
import gqlTag from "graphql-tag";

import type { FlowRun } from "@/database/models";
import type { JourneySegment } from "@/database/services/flows";
import { getStartDateFromPeriod } from "@/metrics/test";

import { IFlowStatus, type IResolvers } from "../__generated__/resolver-types";

const { gql } = gqlTag;

export const typeDefs = gql`
  enum FlowStatus {
    PASSED
    FAILED
    TIMED_OUT
    SKIPPED
    INTERRUPTED
  }

  type FlowAnnotation {
    type: String!
    description: String
  }

  """
  One execution of a flow in a build. A test run under several browsers or
  devices produces one run per project.
  """
  type FlowRun implements Node {
    id: ID!
    status: FlowStatus!
    "Whether the run only passed on a retry"
    flaky: Boolean!
    "Duration of the run in milliseconds"
    duration: Int
    "The browser or device the test ran under, null when the runner has none"
    runnerProject: String
    "Screenshots taken by this run, in capture order"
    screenshots: [Screenshot!]!
  }

  """
  An end-to-end test of the project, as its runner reports it.

  Every field describing an execution — status, screenshots, runs — is read
  from the project's latest reference build.
  """
  type Flow implements Node {
    id: ID!
    "The path of titles leading to the test, starting at the file"
    titlePath: [String!]!
    title: String!
    "The test file the flow is declared in"
    file: String!
    "Runs of the flow in the reference build, one per runner project"
    runs: [FlowRun!]!
    "Screenshots taken by the flow in the reference build, in capture order"
    screenshots: [Screenshot!]!
    """
    Screens it walks — a screen captured at two viewports is one screen, seen
    twice.
    """
    screenCount: Int!
    "The worst status across the runs of the reference build"
    status: FlowStatus!
    "Whether any run of the reference build only passed on a retry"
    flaky: Boolean!
    "Annotations attached to the test, e.g. the reason it is skipped"
    annotations: [FlowAnnotation!]!
    tags: [String!]!
    "Share of runs that ended in failure over the period, 0 to 1"
    failureRate(period: MetricsPeriod!): Float!
    "Share of runs that only passed on a retry over the period, 0 to 1"
    flakyRate(period: MetricsPeriod!): Float!
    "The journey this test takes part in, which may span other tests"
    journey: Journey!
  }

  """
  The screens of one journey contributed by one test.

  A journey is split into segments because that is how suites are written: a
  long path through the product is walked by several tests sharing a screenshot
  folder, and which test took which screen is worth seeing.
  """
  type JourneySegment {
    flow: Flow!
    steps: [JourneyStep!]!
  }

  """
  One screen of a journey, and every way it was captured.

  A single \`argosScreenshot\` call can produce a file per viewport, per color
  scheme and per browser. Those are one step seen several ways, not several
  steps — the same grouping Argos applies everywhere else through the variant
  key.
  """
  type JourneyStep {
    key: String!
    "What the author named the screen"
    name: String!
    "Every capture of the step, one per variant"
    screenshots: [Screenshot!]!
  }

  """
  A path through the product, from the screenshots that walk it.

  Identified by the folder its screenshots share
  (\`supplier-invoice/loan-beneficiary\` gives \`supplier-invoice\`), so it can
  span several tests. A test whose screenshots sit at the root is a journey of
  one.
  """
  type Journey {
    """
    The flow the journey is read from.

    Every test of a journey shows the same journey, so they all address it
    through this one — three rows of a list opening three URLs that render the
    same page is a link that lies about where it goes.
    """
    entryFlowId: ID!
    "The shared folder, null when the screenshots sit at the root"
    name: String
    "The tests that contribute to it, in the order the suite declares them"
    segments: [JourneySegment!]!
    "How many tests contribute to it"
    testCount: Int!
    """
    How many screens it walks — a screen captured at two viewports is one
    screen, seen twice.
    """
    screenCount: Int!
  }

  type FlowConnection implements Connection {
    pageInfo: PageInfo!
    edges: [Flow!]!
  }

  input FlowsFilterInput {
    "Match against the test title and its file"
    search: String
    """
    Keep only the tests that took a screenshot (\`true\`) or only the ones that
    took none (\`false\`). Null keeps both.
    """
    withScreenshots: Boolean
  }
`;

/**
 * The order the runs of a flow are collapsed into one status: the worst one
 * wins, so a test that passes under chromium and fails under firefox reads as
 * failed.
 */
const STATUS_SEVERITY = [
  "interrupted",
  "timedOut",
  "failed",
  "skipped",
  "passed",
] as const;

function getWorstStatus(runs: FlowRun[]): FlowRun["status"] {
  for (const status of STATUS_SEVERITY) {
    if (runs.some((run) => run.status === status)) {
      return status;
    }
  }
  // A flow is only ever listed because it has runs in the build.
  invariant(runs.length === 0, "a flow with runs always matches a status");
  return "passed";
}

const GRAPHQL_STATUS: Record<FlowRun["status"], IFlowStatus> = {
  passed: IFlowStatus.Passed,
  failed: IFlowStatus.Failed,
  timedOut: IFlowStatus.TimedOut,
  skipped: IFlowStatus.Skipped,
  interrupted: IFlowStatus.Interrupted,
};

export const resolvers: IResolvers = {
  Flow: {
    runs: async (flow, _args, ctx) => {
      const context = await ctx.loaders.FlowReferenceContext.load(flow.id);
      return context.runs;
    },
    screenshots: async (flow, _args, ctx) => {
      const context = await ctx.loaders.FlowReferenceContext.load(flow.id);
      return context.screenshots;
    },
    screenCount: async (flow, _args, ctx) => {
      const context = await ctx.loaders.FlowReferenceContext.load(flow.id);
      return context.screenCount;
    },
    status: async (flow, _args, ctx) => {
      const context = await ctx.loaders.FlowReferenceContext.load(flow.id);
      return GRAPHQL_STATUS[getWorstStatus(context.runs)];
    },
    flaky: async (flow, _args, ctx) => {
      const context = await ctx.loaders.FlowReferenceContext.load(flow.id);
      return context.runs.some((run) => run.outcome === "flaky");
    },
    annotations: async (flow, _args, ctx) => {
      const context = await ctx.loaders.FlowReferenceContext.load(flow.id);
      return context.runs.flatMap((run) => run.annotations ?? []);
    },
    tags: async (flow, _args, ctx) => {
      const context = await ctx.loaders.FlowReferenceContext.load(flow.id);
      return [...new Set(context.runs.flatMap((run) => run.tags ?? []))];
    },
    failureRate: async (flow, args, ctx) => {
      const rates = await ctx.loaders.FlowRates.load({
        flowId: flow.id,
        from: getStartDateFromPeriod(args.period),
      });
      return rates.failureRate;
    },
    journey: async (flow, _args, ctx) => {
      return ctx.loaders.FlowJourney.load(flow.id);
    },
    flakyRate: async (flow, args, ctx) => {
      const rates = await ctx.loaders.FlowRates.load({
        flowId: flow.id,
        from: getStartDateFromPeriod(args.period),
      });
      return rates.flakyRate;
    },
  },
  Journey: {
    entryFlowId: (journey) => journey.entryFlowId,
    name: (journey) => journey.key,
    testCount: (journey) => journey.segments.length,
    screenCount: (journey) =>
      journey.segments.reduce(
        (total: number, segment: JourneySegment) =>
          total + segment.steps.length,
        0,
      ),
  },
  FlowRun: {
    status: (run) => GRAPHQL_STATUS[run.status],
    flaky: (run) => run.outcome === "flaky",
    runnerProject: (run) => run.pwProject || null,
    screenshots: async (run, _args, ctx) => {
      return ctx.loaders.FlowRunScreenshots.load(run.id);
    },
  },
};
