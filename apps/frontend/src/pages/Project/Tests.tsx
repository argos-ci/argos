import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useTransition,
} from "react";
import {
  useBackgroundQuery,
  useReadQuery,
  useSuspenseQuery,
  type QueryRef,
} from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { useVirtualizer } from "@tanstack/react-virtual";
import clsx from "clsx";
import { FileImageIcon } from "lucide-react";
import { useQueryStates } from "nuqs";
import { useNumberFormatter } from "react-aria";
import { Heading, Text } from "react-aria-components";
import { useResolvedPath } from "react-router-dom";

import {
  constraintSize,
  DiffCard,
  SingleImage,
} from "@/containers/Build/BuildDiffListPrimitives";
import { PeriodSelect } from "@/containers/PeriodSelect";
import { FlakinessCircleIndicator } from "@/containers/Test/FlakinessCircleIndicator";
import { useTestPeriodState } from "@/containers/Test/Period";
import { SeenChange } from "@/containers/Test/SeenChange";
import { TestStatusIndicator } from "@/containers/TestStatusIndicator";
import { graphql, type DocumentType } from "@/gql";
import { Button, LinkButton } from "@/ui/Button";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateIcon,
  Page,
  PageContainer,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
} from "@/ui/Layout";
import { List, ListHeaderRow, ListRowLink, ListRowLoader } from "@/ui/List";
import { Tooltip } from "@/ui/Tooltip";
import { Truncable } from "@/ui/Truncable";
import { useEventCallback } from "@/ui/useEventCallback";
import { checkAreDefaultValues } from "@/util/search-params";

import { NotFound } from "../NotFound";
import {
  ChangesTooltip,
  ConsistencyTooltip,
  FlakinessTooltip,
  StabilityTooltip,
} from "../Test/Widgets";
import { BuildNameFilter, BuildNameFilterParser } from "./BuildNameFilter";
import { useProjectParams, type ProjectParams } from "./ProjectParams";
import { ProjectTitle } from "./ProjectTitle";

const ProjectTestsQuery = graphql(`
  query ProjectTests_project_tests(
    $accountSlug: String!
    $projectName: String!
    $after: Int!
    $first: Int!
    $filters: TestsFilterInput
    $period: MetricsPeriod!
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      tests(first: $first, after: $after, filters: $filters) {
        pageInfo {
          totalCount
          hasNextPage
        }
        edges {
          id
          name
          buildName
          status
          screenshot {
            id
            width
            height
            contentType
            url
          }
          lastSeenDiff {
            id
            ...ScreenChange_ScreenshotDiff
          }
          metrics(period: $period) {
            all {
              total
              flakiness
              stability
              changes
              consistency
            }
          }
        }
      }
    }
  }
`);

type ProjectTestsDocument = DocumentType<typeof ProjectTestsQuery>;
type Tests = NonNullable<ProjectTestsDocument["project"]>["tests"];
type Test = Tests["edges"][0];

const ProjectQuery = graphql(`
  query ProjectTests_project($accountSlug: String!, $projectName: String!) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      buildNames
    }
  }
`);

const filtersSchema = {
  name: BuildNameFilterParser,
};

function PageContent(props: {
  projectQueryRef: QueryRef<DocumentType<typeof ProjectQuery>>;
  params: ProjectParams;
}) {
  const { projectQueryRef, params } = props;
  const periodState = useTestPeriodState();
  const [filters, setFilters] = useQueryStates(filtersSchema);
  const hasFilters = !checkAreDefaultValues(filtersSchema, filters);
  const deferredFilters = useDeferredValue(filters);
  const deferredPeriod = useDeferredValue(periodState.value);
  const isUpdating =
    filters !== deferredFilters || periodState.value !== deferredPeriod;
  const filtersVariable = useMemo(() => {
    return { buildName: deferredFilters.name };
  }, [deferredFilters]);
  const { fetchMore, data: projectTestData } = useSuspenseQuery(
    ProjectTestsQuery,
    {
      variables: {
        accountSlug: params.accountSlug,
        projectName: params.projectName,
        filters: filtersVariable,
        period: deferredPeriod,
        after: 0,
        first: 20,
      },
    },
  );
  const {
    data: { project },
  } = useReadQuery(projectQueryRef);
  const tests = projectTestData.project?.tests;
  const [isFetchingMore, startFetchMoreTransition] = useTransition();
  const fetchNextPage = useEventCallback(() => {
    invariant(tests);
    startFetchMoreTransition(() => {
      fetchMore({
        variables: {
          after: tests.edges.length,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!prev.project?.tests?.edges || !fetchMoreResult?.project?.tests) {
            return fetchMoreResult;
          }

          return {
            ...prev,
            project: {
              ...prev.project,
              tests: {
                ...prev.project.tests,
                ...fetchMoreResult.project.tests,
                edges: [
                  ...prev.project.tests.edges,
                  ...fetchMoreResult.project.tests.edges,
                ],
              },
            },
          };
        },
      });
    });
  });

  if (!tests || !project) {
    return <NotFound />;
  }

  if (tests.pageInfo.totalCount === 0 && !hasFilters) {
    return (
      <PageContainer>
        <EmptyState>
          <EmptyStateIcon>
            <FileImageIcon strokeWidth={1} />
          </EmptyStateIcon>
          <Heading>No tests</Heading>
          <Text slot="description">
            There are no tests yet on this project.
          </Text>
          <EmptyStateActions>
            <LinkButton href="/">Back to home</LinkButton>
          </EmptyStateActions>
        </EmptyState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <Heading>Tests</Heading>
          <Text slot="headline">
            View all the tests associated with this project.
          </Text>
        </PageHeaderContent>
        <PageHeaderActions>
          <PeriodSelect state={periodState} />
          {project.buildNames.length > 1 && (
            <BuildNameFilter
              buildNames={project.buildNames}
              value={filters.name}
              onChange={(name) => setFilters({ name })}
            />
          )}
        </PageHeaderActions>
      </PageHeader>
      <div className="relative flex-1">
        {hasFilters && tests.pageInfo.totalCount === 0 ? (
          <EmptyState>
            <EmptyStateIcon>
              <FileImageIcon strokeWidth={1} />
            </EmptyStateIcon>
            <Heading>No tests</Heading>
            <Text slot="description">
              There is no tests matching the filters.
            </Text>
            <EmptyStateActions>
              <Button onPress={() => setFilters(null)}>Reset filters</Button>
            </EmptyStateActions>
          </EmptyState>
        ) : (
          <TestsList
            tests={tests}
            fetchNextPage={fetchNextPage}
            isFetchingMore={isFetchingMore}
            isUpdating={isUpdating}
          />
        )}
      </div>
    </PageContainer>
  );
}

function TestsList(props: {
  tests: Tests;
  isFetchingMore: boolean;
  isUpdating: boolean;
  fetchNextPage: () => void;
}) {
  const { tests, isFetchingMore, isUpdating, fetchNextPage } = props;
  const parentRef = useRef<HTMLDivElement>(null);
  const { hasNextPage } = tests.pageInfo;
  const displayCount = tests.edges.length;
  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? displayCount + 1 : displayCount,
    estimateSize: () => 75,
    getScrollElement: () => parentRef.current,
    overscan: 20,
    getItemKey: (index) => {
      const test = tests.edges[index];
      if (test) {
        return test.id;
      }
      return "loader";
    },
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  const lastItem = virtualItems[virtualItems.length - 1];
  useEffect(() => {
    if (
      lastItem &&
      lastItem.index === displayCount &&
      !isFetchingMore &&
      hasNextPage
    ) {
      fetchNextPage();
    }
  }, [lastItem, displayCount, isFetchingMore, hasNextPage, fetchNextPage]);

  return (
    <List
      className={clsx(
        "absolute max-h-full w-full overflow-hidden",
        isUpdating && "animate-pulse",
      )}
    >
      <ListHeaderRow>
        <div className="flex-1 truncate">Test</div>
        <div className="w-30">Last change</div>
        <div className="w-20">
          <Tooltip content={<FlakinessTooltip />}>
            <span className="underline-emphasis">Flakiness</span>
          </Tooltip>
        </div>
        <div className="w-20">
          <Tooltip content={<TestsChangesTooltip />}>
            <span className="underline-emphasis">Changes</span>
          </Tooltip>
        </div>
        <div className="w-20">
          <Tooltip content={<StabilityTooltip />}>
            <span className="underline-emphasis">Stability</span>
          </Tooltip>
        </div>
        <div className="w-20">
          <Tooltip content={<ConsistencyTooltip />}>
            <span className="underline-emphasis">Consistency</span>
          </Tooltip>
        </div>
      </ListHeaderRow>
      <div ref={parentRef} className="overflow-auto">
        <div
          className="relative"
          style={{
            height: rowVirtualizer.getTotalSize(),
          }}
        >
          {virtualItems.map((virtualRow) => {
            const test = tests.edges[virtualRow.index];

            if (!test) {
              return (
                <ListRowLoader
                  key={virtualRow.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  Fetching tests...
                </ListRowLoader>
              );
            }
            return (
              <TestRow
                key={virtualRow.key}
                test={test}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              />
            );
          })}
        </div>
      </div>
    </List>
  );
}

function TestsChangesTooltip() {
  const periodState = useTestPeriodState();
  return (
    <ChangesTooltip
      periodLabel={periodState.definition[periodState.value].label}
    />
  );
}

const DIFF_IMAGE_CONFIG = {
  maxWidth: 112,
  maxHeight: 56,
  defaultHeight: 56,
};

function TestRow(props: { test: Test; style: React.CSSProperties }) {
  const { test, style } = props;
  const params = useProjectParams();
  invariant(params);
  const resolvedTest = useResolvedPath(test.id);
  const compactFormatter = useNumberFormatter({ notation: "compact" });
  return (
    <ListRowLink
      href={resolvedTest.pathname}
      className="flex items-center gap-6 p-4 text-sm"
      style={style}
    >
      <div className="flex flex-1 gap-4 truncate">
        {test.screenshot &&
        test.screenshot.width != null &&
        test.screenshot.height != null ? (
          <DiffCard
            isActive={false}
            variant="neutral"
            className="w-28 shrink-0"
          >
            <SingleImage
              contentType={test.screenshot.contentType}
              dimensions={constraintSize(
                {
                  width: test.screenshot.width,
                  height: test.screenshot.height,
                },
                DIFF_IMAGE_CONFIG,
              )}
              url={test.screenshot.url}
            />
          </DiffCard>
        ) : null}
        <div className="truncate">
          <Truncable className="font-medium">{test.name}</Truncable>
          <div className="text-low">
            {test.buildName} · <TestStatusIndicator status={test.status} />
          </div>
        </div>
      </div>
      <div className="w-30">
        <SeenChange params={params} diff={test.lastSeenDiff ?? null} />
      </div>
      <div className="w-20">
        <FlakinessCircleIndicator
          value={test.metrics.all.flakiness}
          className="size-12"
        />
      </div>
      <div className="w-20">{test.metrics.all.changes}</div>
      <div className="w-20">
        {compactFormatter.format(test.metrics.all.stability * 100)}
        <small className="text-low ml-0.5">%</small>
      </div>
      <div className="w-20">
        {compactFormatter.format(test.metrics.all.consistency * 100)}
        <small className="text-low ml-0.5">%</small>
      </div>
    </ListRowLink>
  );
}

export function Component() {
  const params = useProjectParams();
  invariant(params, "it is a project route");

  const [projectQueryRef] = useBackgroundQuery(ProjectQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
    },
  });

  return (
    <Page>
      <ProjectTitle params={params}>Tests</ProjectTitle>
      <PageContent projectQueryRef={projectQueryRef} params={params} />
    </Page>
  );
}
