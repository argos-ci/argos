import { useMemo, useTransition } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import {
  CameraIcon,
  FileImageIcon,
  ImageIcon,
  RouteIcon,
  SearchIcon,
} from "lucide-react";
import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";

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
import { List, ListHeaderRow, ListRowLink } from "@/ui/List";
import { Text } from "@/ui/Text";
import { TextInput, TextInputGroup, TextInputIcon } from "@/ui/TextInput";
import { Tooltip } from "@/ui/Tooltip";
import { Truncable } from "@/ui/Truncable";
import { useEventCallback } from "@/ui/useEventCallback";

import { NotFound } from "../NotFound";
import { useProjectParams, type ProjectParams } from "./ProjectParams";
import { ProjectTitle } from "./ProjectTitle";

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

function FlowRow(props: { flow: Flow; params: ProjectParams }) {
  const { flow, params } = props;
  const skipReason = flow.annotations.find(
    (annotation) => annotation.type === "skip" || annotation.type === "fixme",
  )?.description;

  return (
    <ListRowLink
      href={`/${params.accountSlug}/${params.projectName}/flows/${flow.id}`}
      className="flex items-center gap-4 p-4 text-sm"
    >
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
      {/* An icon, not a count: at a glance the column answers "is there
          anything to look at", and the row itself is the way to find out how
          much. A test with no screenshot leaves the cell empty, so the gap is
          what stands out rather than a column of zeros. */}
      <div className="flex w-16 justify-end">
        {flow.screenshotCount > 0 ? (
          <Tooltip
            content={`${flow.screenshotCount} screenshot${
              flow.screenshotCount > 1 ? "s" : ""
            }`}
          >
            <ImageIcon className="text-primary-low size-4" />
          </Tooltip>
        ) : null}
      </div>
      <div className="w-20 text-right tabular-nums">
        <Rate
          value={flow.failureRate}
          className="text-danger-low font-medium"
        />
      </div>
      <div className="w-20 text-right tabular-nums">
        <Rate value={flow.flakyRate} className="text-pending-low font-medium" />
      </div>
    </ListRowLink>
  );
}

/**
 * Flows come back in declaration order — by file, then by line — so grouping
 * them is a matter of cutting the list where the file changes, and never
 * reorders what the server sent.
 */
function useFlowsBySpec(flows: Flow[]) {
  return useMemo(() => {
    const groups: { file: string; flows: Flow[] }[] = [];
    for (const flow of flows) {
      const last = groups.at(-1);
      if (last && last.file === flow.file) {
        last.flows.push(flow);
      } else {
        groups.push({ file: flow.file, flows: [flow] });
      }
    }
    return groups;
  }, [flows]);
}

function PageContent(props: { params: ProjectParams }) {
  const { params } = props;
  const [filters, setFilters] = useQueryStates(
    {
      search: parseAsString,
      withoutScreenshots: parseAsBoolean,
    },
    { history: "replace" },
  );
  const hasFilters = Boolean(filters.search || filters.withoutScreenshots);

  const { data, fetchMore } = useSuspenseQuery(ProjectFlowsQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
      after: 0,
      first: PAGE_SIZE,
      period: MetricsPeriod.Last_30Days,
      filters: {
        search: filters.search,
        withoutScreenshots: filters.withoutScreenshots,
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
            {flowStats.screenshotCount} screens captured across{" "}
            {flowStats.urlCount} distinct URLs.
          </Text>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button
            variant={filters.withoutScreenshots ? "primary" : "secondary"}
            onClick={() =>
              setFilters({
                withoutScreenshots: filters.withoutScreenshots ? null : true,
              })
            }
          >
            Without screenshots
          </Button>
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
          <div className="text-low flex items-center gap-4 px-4 text-xs font-semibold">
            <div className="flex-1">Test</div>
            <div className="w-16 text-right">Screens</div>
            <div className="w-20 text-right">Failures</div>
            <div className="w-20 text-right">Flaky</div>
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
                {group.flows.map((flow) => (
                  <FlowRow key={flow.id} flow={flow} params={params} />
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
