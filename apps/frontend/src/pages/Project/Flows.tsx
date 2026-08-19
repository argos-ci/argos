import { useMemo, useTransition } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import {
  ArrowRightIcon,
  CameraIcon,
  FileImageIcon,
  ImageIcon,
  PlugIcon,
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
import { Link } from "@/ui/Link";
import { List, ListHeaderRow, ListRow } from "@/ui/List";
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
      flows(after: $after, first: $first, filters: $filters) {
        pageInfo {
          totalCount
          hasNextPage
        }
        edges {
          id
          title
          titlePath
          file
          status
          flaky
          screenCount
          journey {
            entryFlowId
            name
            testCount
            screenCount
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
 * Whether this row has screens.
 *
 * An indicator, not a link: the journey is the spec file, so the way into it is
 * said once in the header above rather than repeated down every row.
 */
function ScreensCell(props: { flow: Flow }) {
  const { flow } = props;
  if (flow.screenCount === 0) {
    // A test with no screenshot leaves the cell empty, so the gap is what
    // stands out rather than a column of zeros.
    return null;
  }
  const label = `${flow.screenCount} screen${flow.screenCount > 1 ? "s" : ""}`;
  return (
    <Tooltip content={label}>
      {/* Deliberately not the link colour: this says the row has screens, it
          does not take you to them. */}
      <ImageIcon className="text-low size-4" />
    </Tooltip>
  );
}

function FlowRow(props: { flow: Flow }) {
  const { flow } = props;
  const skipReason = flow.annotations.find(
    (annotation) => annotation.type === "skip" || annotation.type === "fixme",
  )?.description;
  // Everything between the file and the title: the describes the test is
  // nested in. Without them a title like "works" says nothing, and two tests
  // named the same in two describes are the same row twice.
  const describes = flow.titlePath.slice(1, -1);

  return (
    <ListRow className="flex items-center gap-8 p-4 text-sm">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Tooltip content={STATUS_LABEL[flow.status]}>
          <div
            className={`size-2 shrink-0 rounded-full ${STATUS_COLOR[flow.status]}`}
          />
        </Tooltip>
        {describes.length > 0 ? (
          <span className="text-low max-w-2/5 shrink truncate">
            {`${describes.join(" \u203a ")} \u203a`}
          </span>
        ) : null}
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
        <ScreensCell flow={flow} />
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
type SpecGroup = {
  file: string;
  flows: Flow[];
  /** The flow the file's journey is read from: its first test. */
  entryFlowId: string;
  screenCount: number;
};

/**
 * Flows come back in declaration order — by file, then by line — so grouping is
 * a matter of cutting the list where the file changes, and never reorders what
 * the server sent.
 *
 * A file is also a journey, so the group carries the way into it: said once, in
 * the header, rather than repeated down every row underneath.
 */
function useFlowsBySpec(flows: Flow[]): SpecGroup[] {
  return useMemo(() => {
    const groups: SpecGroup[] = [];
    for (const flow of flows) {
      const last = groups.at(-1);
      if (last && last.file === flow.file) {
        last.flows.push(flow);
      } else {
        groups.push({
          file: flow.file,
          flows: [flow],
          entryFlowId: flow.journey.entryFlowId,
          screenCount: flow.journey.screenCount,
        });
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

  const { flows } = project;

  if (flows.pageInfo.totalCount === 0 && !hasFilters) {
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
              icon={<PlugIcon />}
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
            Every end-to-end test the reference build ran, and the screens it
            captured — the ones that capture nothing included. Open a flow to
            walk its screens in order.
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
            return (
              <List key={group.file}>
                <ListHeaderRow>
                  <div className="flex-1 truncate font-mono">{group.file}</div>
                  {/* The way in, said in words. The file name reads as a
                      heading, so making it the link left the reader guessing
                      what pressing it would do. A file where nothing captures
                      has nothing to open, and shows no link at all. */}
                  {group.screenCount > 0 ? (
                    <Link
                      href={`/${params.accountSlug}/${params.projectName}/flows/${group.entryFlowId}`}
                      aria-label={`Open the flow ${group.file}`}
                      className="flex shrink-0 items-center gap-1"
                    >
                      Open the flow
                      <ArrowRightIcon className="size-3.5" />
                    </Link>
                  ) : null}
                </ListHeaderRow>
                {group.flows.map((flow) => (
                  <FlowRow key={flow.id} flow={flow} />
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
