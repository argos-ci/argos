import { Fragment, useMemo, useTransition } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import {
  CameraIcon,
  FileImageIcon,
  ImageIcon,
  RouteIcon,
  SearchIcon,
} from "lucide-react";
import { parseAsString, useQueryStates } from "nuqs";

import { TestsIllustration } from "@/containers/EmptyStateIllustrations";
import { graphql, type DocumentType } from "@/gql";
import { FlowStatus, MetricsPeriod } from "@/gql/graphql";
import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { Heading } from "@/ui/Heading";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateIcon,
  EmptyStateIllustration,
  EmptyStateLearnMore,
  EmptyStateStep,
  EmptyStateSteps,
  Page,
  PageContainer,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
} from "@/ui/Layout";
import { List, ListHeaderRow, ListRow } from "@/ui/List";
import { RouterLink } from "@/ui/RouterLink";
import { Text } from "@/ui/Text";
import { TextInput, TextInputGroup, TextInputIcon } from "@/ui/TextInput";
import { Tooltip } from "@/ui/Tooltip";
import { Truncable } from "@/ui/Truncable";
import { useEventCallback } from "@/ui/useEventCallback";

import { NotFound } from "../NotFound";
import { useProjectParams, type ProjectParams } from "./ProjectParams";
import { ProjectTitle } from "./ProjectTitle";
import {
  getScreensFilterInput,
  ScreensFilter,
  ScreensFilterParser,
} from "./ScreensFilter";

const PAGE_SIZE = 200;

const ProjectFlowsQuery = graphql(`
  query ProjectFlows_project(
    $accountSlug: String!
    $projectName: String!
    $after: Int!
    $first: Int!
    $period: MetricsPeriod!
    $filters: FlowsFilterInput
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      flowStats {
        flowCount
        capturingFlowCount
        screenshotCount
        urlCount
      }
      flows(after: $after, first: $first, filters: $filters) {
        pageInfo {
          totalCount
          hasNextPage
        }
        edges {
          id
          title
          file
          status
          flaky
          screenshotCount
          journey {
            entryFlowId
            name
            testCount
            screenshotCount
          }
          failureRate(period: $period)
          flakyRate(period: $period)
          annotations {
            type
            description
          }
        }
      }
    }
  }
`);

type Project = NonNullable<DocumentType<typeof ProjectFlowsQuery>["project"]>;
type Flow = Project["flows"]["edges"][number];

const STATUS_COLOR: Record<FlowStatus, string> = {
  [FlowStatus.Passed]: "bg-success-solid",
  [FlowStatus.Failed]: "bg-danger-solid",
  [FlowStatus.TimedOut]: "bg-danger-solid",
  [FlowStatus.Interrupted]: "bg-warning-solid",
  [FlowStatus.Skipped]: "bg-solid",
};

const STATUS_LABEL: Record<FlowStatus, string> = {
  [FlowStatus.Passed]: "Passed",
  [FlowStatus.Failed]: "Failed",
  [FlowStatus.TimedOut]: "Timed out",
  [FlowStatus.Interrupted]: "Interrupted",
  [FlowStatus.Skipped]: "Skipped",
};

/**
 * Rates are shares of runs, so they are only worth showing once they are not
 * zero — a column of "0%" reads as noise, an empty cell as "nothing to see".
 */
function Rate(props: { value: number; className?: string }) {
  const { value, className } = props;
  if (value <= 0) {
    return <span className="text-low">—</span>;
  }
  return <span className={className}>{Math.round(value * 100)}%</span>;
}

/**
 * Whether this row has screens, and — when nothing above it says so — the way
 * to them.
 *
 * A journey is named once, in the section header above the tests that share it,
 * so repeating its name on every row would say nothing a reader has not just
 * read. The exception is a test whose screenshots sit at the root: it has no
 * folder, so no section header carries it, and its own icon is the only way in.
 */
function ScreensCell(props: { flow: Flow; params: ProjectParams }) {
  const { flow, params } = props;
  if (flow.screenshotCount === 0) {
    // A test with no screenshot leaves the cell empty, so the gap is what
    // stands out rather than a column of zeros.
    return null;
  }

  const { journey } = flow;
  const label = `${flow.screenshotCount} screen${
    flow.screenshotCount > 1 ? "s" : ""
  }`;

  if (journey.name) {
    return (
      <Tooltip content={label}>
        <ImageIcon className="text-primary-low size-4" />
      </Tooltip>
    );
  }

  return (
    <RouterLink
      href={`/${params.accountSlug}/${params.projectName}/flows/${journey.entryFlowId}`}
      aria-label={`See the ${label} of this test`}
      className="text-primary-low hover:text-primary"
    >
      <ImageIcon className="size-4" />
    </RouterLink>
  );
}

function FlowRow(props: { flow: Flow; params: ProjectParams }) {
  const { flow, params } = props;
  const skipReason = flow.annotations.find(
    (annotation) => annotation.type === "skip" || annotation.type === "fixme",
  )?.description;

  return (
    <ListRow className="flex items-center gap-8 p-4 text-sm">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Tooltip content={STATUS_LABEL[flow.status]}>
          <div
            className={`size-2 shrink-0 rounded-full ${STATUS_COLOR[flow.status]}`}
          />
        </Tooltip>
        <Truncable className="font-medium">{flow.title}</Truncable>
        {flow.status === FlowStatus.Failed ? (
          <Chip color="danger" scale="xs">
            Failed
          </Chip>
        ) : null}
        {flow.flaky ? (
          <Chip color="pending" scale="xs">
            Flaky
          </Chip>
        ) : null}
        {skipReason ? (
          <span className="text-low shrink-0 italic">{skipReason}</span>
        ) : null}
      </div>
      <div className="flex w-20 justify-end">
        <ScreensCell flow={flow} params={params} />
      </div>
      <div className="w-28 text-right tabular-nums">
        <Rate
          value={flow.failureRate}
          className="text-danger-low font-medium"
        />
      </div>
      <div className="w-28 text-right tabular-nums">
        <Rate value={flow.flakyRate} className="text-pending-low font-medium" />
      </div>
    </ListRow>
  );
}

/**
 * Flows come back in declaration order — by file, then by line — so grouping
 * them is a matter of cutting the list where the file changes, and never
 * reorders what the server sent.
 */
type JourneySection = {
  /** Null for the tests whose screenshots sit at the root, which share none. */
  name: string | null;
  entryFlowId: string;
  screenshotCount: number;
  flows: Flow[];
};

type SpecGroup = { file: string; flows: Flow[]; sections: JourneySection[] };

/**
 * Flows come back in declaration order — by file, then by line — so grouping is
 * a matter of cutting the list where the file or the journey changes, and never
 * reorders what the server sent.
 *
 * Journeys are a level of their own rather than a label on the file: one spec
 * commonly holds several of them (a component test, then two variants of the
 * same request), so naming the journey on the file would name three at once and
 * tell nobody which test belongs to which.
 */
function useFlowsBySpec(flows: Flow[]): SpecGroup[] {
  return useMemo(() => {
    const groups: SpecGroup[] = [];
    for (const flow of flows) {
      let group = groups.at(-1);
      if (!group || group.file !== flow.file) {
        group = { file: flow.file, flows: [], sections: [] };
        groups.push(group);
      }
      group.flows.push(flow);

      const name = flow.journey.name;
      const section = group.sections.at(-1);
      // Consecutive tests with no journey of their own share one section: it
      // draws no header, so there is nothing to repeat.
      if (section && section.name === name) {
        section.flows.push(flow);
      } else {
        group.sections.push({
          name,
          entryFlowId: flow.journey.entryFlowId,
          screenshotCount: flow.journey.screenshotCount,
          flows: [flow],
        });
      }
    }
    return groups;
  }, [flows]);
}

/**
 * The journey a run of tests shares, named and linked once — which is all a
 * reader needs, and all the list has room to say without repeating itself down
 * every row underneath.
 */
function JourneyHeaderRow(props: {
  section: JourneySection;
  params: ProjectParams;
}) {
  const { section, params } = props;
  const { name, flows, screenshotCount } = section;
  return (
    <div className="bg-subtle flex items-center gap-3 border-b px-4 py-2">
      <RouterLink
        href={`/${params.accountSlug}/${params.projectName}/flows/${section.entryFlowId}`}
        className="text-primary-low hover:text-primary flex min-w-0 items-center gap-1.5 text-xs font-semibold"
      >
        <RouteIcon className="size-3.5 shrink-0" />
        <span className="truncate">{name}</span>
      </RouterLink>
      <span className="text-low text-xs tabular-nums">
        {screenshotCount} screen{screenshotCount === 1 ? "" : "s"}
        {flows.length > 1 ? ` across ${flows.length} tests` : null}
      </span>
    </div>
  );
}

function PageContent(props: { params: ProjectParams }) {
  const { params } = props;
  const [filters, setFilters] = useQueryStates(
    {
      search: parseAsString,
      screens: ScreensFilterParser,
    },
    { history: "replace" },
  );
  const hasFilters = Boolean(filters.search || filters.screens !== "all");

  const { data, fetchMore } = useSuspenseQuery(ProjectFlowsQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
      after: 0,
      first: PAGE_SIZE,
      period: MetricsPeriod.Last_30Days,
      filters: {
        search: filters.search,
        withScreenshots: getScreensFilterInput(filters.screens),
      },
    },
  });

  const project = data.project;
  const [isFetchingMore, startFetchMoreTransition] = useTransition();
  const fetchNextPage = useEventCallback(() => {
    invariant(project);
    startFetchMoreTransition(() => {
      fetchMore({
        variables: { after: project.flows.edges.length },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!prev.project?.flows || !fetchMoreResult?.project?.flows) {
            return fetchMoreResult;
          }
          return {
            ...prev,
            project: {
              ...prev.project,
              flows: {
                ...fetchMoreResult.project.flows,
                edges: [
                  ...prev.project.flows.edges,
                  ...fetchMoreResult.project.flows.edges,
                ],
              },
            },
          };
        },
      });
    });
  });

  const groups = useFlowsBySpec(project?.flows.edges ?? []);

  if (!project) {
    return <NotFound />;
  }

  const { flowStats, flows } = project;

  if (flowStats.flowCount === 0 && !hasFilters) {
    return (
      <PageContainer>
        <EmptyState>
          <EmptyStateIllustration>
            <TestsIllustration />
          </EmptyStateIllustration>
          <Heading>No flows yet</Heading>
          <Text slot="description">
            A flow is one end-to-end test and the screens it captures. Argos
            learns about them from the Playwright reporter — including the tests
            that capture nothing, which is the only way it can tell them from
            tests it has never heard of.
          </Text>
          <EmptyStateLearnMore href="https://argos-ci.com/docs/reference/playwright" />
          <EmptyStateSteps>
            <EmptyStateStep
              icon={<RouteIcon />}
              step="In your config"
              title="Enable the reporter"
            >
              Add <code>@argos-ci/playwright/reporter</code> to your Playwright
              config. It reports every test of the run, not only the ones that
              take a screenshot.
            </EmptyStateStep>
            <EmptyStateStep
              icon={<CameraIcon />}
              step="In your tests"
              title="Capture the screens"
            >
              Each <code>argosScreenshot</code> call becomes a step of the flow,
              in the order the test walked them.
            </EmptyStateStep>
            <EmptyStateStep
              icon={<ImageIcon />}
              step="Back here"
              title="See what is covered"
            >
              Every test of the suite shows up, so the ones capturing nothing
              are visible instead of missing.
            </EmptyStateStep>
          </EmptyStateSteps>
        </EmptyState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <Heading>Flows</Heading>
          <Text slot="headline">
            {/* Stated, not scored. A test that legitimately captures nothing —
                a redirect guard, an API check — would drag a coverage
                percentage down for being right. */}
            {flowStats.flowCount} tests ran in the reference build,{" "}
            {flowStats.capturingFlowCount} of them took at least one screenshot.{" "}
            {flowStats.screenshotCount} screenshots captured across{" "}
            {flowStats.urlCount} distinct URLs.
          </Text>
        </PageHeaderContent>
        <PageHeaderActions>
          <ScreensFilter
            value={filters.screens}
            onChange={(screens) => setFilters({ screens })}
          />
          <TextInputGroup className="w-64">
            <TextInputIcon>
              <SearchIcon />
            </TextInputIcon>
            <TextInput
              type="search"
              placeholder="Search flows…"
              scale="sm"
              value={filters.search ?? ""}
              onChange={(event) =>
                setFilters({ search: event.target.value || null })
              }
            />
          </TextInputGroup>
        </PageHeaderActions>
      </PageHeader>

      {flows.pageInfo.totalCount === 0 ? (
        <EmptyState>
          <EmptyStateIcon>
            <FileImageIcon strokeWidth={1} />
          </EmptyStateIcon>
          <Heading>No flows</Heading>
          <Text slot="description">There is no flow matching the filters.</Text>
          <EmptyStateActions>
            <Button onClick={() => setFilters(null)}>Reset filters</Button>
          </EmptyStateActions>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          {/* One header for the whole list rather than one per spec: the
              columns are the same everywhere, and repeating their names above
              each file would drown the file names they sit next to. */}
          <div className="text-low flex items-center gap-8 px-4 text-xs font-semibold">
            <div className="flex-1">Test</div>
            <div className="w-20 text-right">Screens</div>
            <div className="w-28 text-right">Failure Rate</div>
            <div className="w-28 text-right">Flaky Rate</div>
          </div>
          {groups.map((group) => {
            const capturing = group.flows.filter(
              (flow) => flow.screenshotCount > 0,
            ).length;
            const screens = group.flows.reduce(
              (total, flow) => total + flow.screenshotCount,
              0,
            );
            return (
              <List key={group.file}>
                <ListHeaderRow>
                  <div className="flex-1 truncate font-mono">{group.file}</div>
                  <div className="text-low tabular-nums">
                    {screens} screen{screens === 1 ? "" : "s"} · {capturing}/
                    {group.flows.length} capture
                  </div>
                </ListHeaderRow>
                {group.sections.map((section) => (
                  <Fragment key={section.name ?? section.entryFlowId}>
                    {section.name ? (
                      <JourneyHeaderRow section={section} params={params} />
                    ) : null}
                    {section.flows.map((flow) => (
                      <FlowRow key={flow.id} flow={flow} params={params} />
                    ))}
                  </Fragment>
                ))}
              </List>
            );
          })}
          {flows.pageInfo.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                disabled={isFetchingMore}
                onClick={fetchNextPage}
              >
                {isFetchingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </PageContainer>
  );
}

export function Component() {
  const params = useProjectParams();
  invariant(params, "it is a project route");

  return (
    <Page>
      <ProjectTitle params={params}>Flows</ProjectTitle>
      <PageContent params={params} />
    </Page>
  );
}
