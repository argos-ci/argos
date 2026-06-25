import {
  Suspense,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useTransition,
} from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { useVirtualizer } from "@tanstack/react-virtual";
import clsx from "clsx";
import { FileImageIcon, SearchIcon } from "lucide-react";
import { parseAsString, useQueryStates } from "nuqs";
import { useNumberFormatter } from "react-aria";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";

import {
  constraintSize,
  DiffCard,
  SingleImage,
} from "@/containers/Build/BuildDiffListPrimitives";
import { PeriodSelect } from "@/containers/PeriodSelect";
import { FlakinessCircleIndicator } from "@/containers/Test/FlakinessCircleIndicator";
import { useTestPeriodState } from "@/containers/Test/Period";
import { SeenChange } from "@/containers/Test/SeenChange";
import { graphql, type DocumentType } from "@/gql";
import { Button } from "@/ui/Button";
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
import { HeadlessLink } from "@/ui/Link";
import { List, ListHeaderRow, ListRowLink, ListRowLoader } from "@/ui/List";
import { PageLoader } from "@/ui/PageLoader";
import { TextInput, TextInputGroup, TextInputIcon } from "@/ui/TextInput";
import { Tooltip } from "@/ui/Tooltip";
import { Truncable } from "@/ui/Truncable";
import { useEventCallback } from "@/ui/useEventCallback";
import { checkAreDefaultValues } from "@/util/search-params";

import {
  ChangesTooltip,
  ConsistencyTooltip,
  FlakinessTooltip,
  StabilityTooltip,
} from "../Test/Widgets";
import { useAccountParams } from "./AccountParams";

const AccountTestsQuery = graphql(`
  query AccountTests_account_tests(
    $accountSlug: String!
    $after: Int!
    $first: Int!
    $filters: TestsFilterInput
    $period: MetricsPeriod!
  ) {
    account(slug: $accountSlug) {
      id
      tests(first: $first, after: $after, period: $period, filters: $filters) {
        pageInfo {
          totalCount
          hasNextPage
        }
        edges {
          id
          name
          buildName
          status
          project {
            id
            name
          }
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

type AccountTestsDocument = DocumentType<typeof AccountTestsQuery>;
type Tests = NonNullable<AccountTestsDocument["account"]>["tests"];
type Test = Tests["edges"][0];

const filtersSchema = {
  search: parseAsString,
};

function PageContent(props: { accountSlug: string }) {
  const { accountSlug } = props;
  const periodState = useTestPeriodState();
  const [filters, setFilters] = useQueryStates(filtersSchema);
  const hasFilters = !checkAreDefaultValues(filtersSchema, filters);
  const deferredFilters = useDeferredValue(filters);
  const deferredPeriod = useDeferredValue(periodState.value);
  const isUpdating =
    filters !== deferredFilters || periodState.value !== deferredPeriod;
  const filtersVariable = useMemo(() => {
    return { search: deferredFilters.search || undefined };
  }, [deferredFilters]);
  const { fetchMore, data } = useSuspenseQuery(AccountTestsQuery, {
    variables: {
      accountSlug,
      filters: filtersVariable,
      period: deferredPeriod,
      after: 0,
      first: 20,
    },
  });
  const tests = data.account?.tests;
  const [isFetchingMore, startFetchMoreTransition] = useTransition();
  const fetchNextPage = useEventCallback(() => {
    invariant(tests);
    startFetchMoreTransition(() => {
      fetchMore({
        variables: { after: tests.edges.length },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!prev.account?.tests?.edges || !fetchMoreResult?.account?.tests) {
            return fetchMoreResult;
          }
          return {
            ...prev,
            account: {
              ...prev.account,
              tests: {
                ...prev.account.tests,
                ...fetchMoreResult.account.tests,
                edges: [
                  ...prev.account.tests.edges,
                  ...fetchMoreResult.account.tests.edges,
                ],
              },
            },
          };
        },
      });
    });
  });

  if (!tests) {
    return null;
  }

  if (tests.pageInfo.totalCount === 0 && !hasFilters) {
    return (
      <EmptyState>
        <EmptyStateIcon>
          <FileImageIcon strokeWidth={1} />
        </EmptyStateIcon>
        <Heading>No tests</Heading>
        <Text slot="description">
          There are no tests yet across this account's projects.
        </Text>
      </EmptyState>
    );
  }

  if (hasFilters && tests.pageInfo.totalCount === 0) {
    return (
      <EmptyState>
        <EmptyStateIcon>
          <FileImageIcon strokeWidth={1} />
        </EmptyStateIcon>
        <Heading>No tests</Heading>
        <Text slot="description">There is no tests matching the filters.</Text>
        <EmptyStateActions>
          <Button onPress={() => setFilters(null)}>Reset filters</Button>
        </EmptyStateActions>
      </EmptyState>
    );
  }

  return (
    <TestsList
      accountSlug={accountSlug}
      tests={tests}
      fetchNextPage={fetchNextPage}
      isFetchingMore={isFetchingMore}
      isUpdating={isUpdating}
    />
  );
}

function TestsList(props: {
  accountSlug: string;
  tests: Tests;
  isUpdating: boolean;
  isFetchingMore: boolean;
  fetchNextPage: () => void;
}) {
  const { accountSlug, tests, isUpdating, isFetchingMore, fetchNextPage } =
    props;
  const parentRef = useRef<HTMLDivElement>(null);
  const { hasNextPage } = tests.pageInfo;
  const displayCount = tests.edges.length;
  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? displayCount + 1 : displayCount,
    estimateSize: () => 75,
    getScrollElement: () => parentRef.current,
    overscan: 20,
    getItemKey: (index) => tests.edges[index]?.id ?? "loader",
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
        <div className="w-40 truncate">Project</div>
        <div className="w-30 text-right">Last change</div>
        <div className="w-20 text-center">
          <Tooltip content={<FlakinessTooltip />}>
            <span className="underline-emphasis">Flakiness</span>
          </Tooltip>
        </div>
        <div className="w-20 text-right">
          <Tooltip content={<TestsChangesTooltip />}>
            <span className="underline-emphasis">Changes</span>
          </Tooltip>
        </div>
        <div className="w-20 text-right">
          <Tooltip content={<StabilityTooltip />}>
            <span className="underline-emphasis">Stability</span>
          </Tooltip>
        </div>
        <div className="w-20 text-right">
          <Tooltip content={<ConsistencyTooltip />}>
            <span className="underline-emphasis">Consistency</span>
          </Tooltip>
        </div>
      </ListHeaderRow>
      <div ref={parentRef} className="overflow-auto">
        <div
          className="relative"
          style={{ height: rowVirtualizer.getTotalSize() }}
        >
          {virtualItems.map((virtualRow) => {
            const test = tests.edges[virtualRow.index];
            const style: React.CSSProperties = {
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: virtualRow.size,
              transform: `translateY(${virtualRow.start}px)`,
            };
            if (!test) {
              return (
                <ListRowLoader key={virtualRow.key} style={style}>
                  Fetching tests...
                </ListRowLoader>
              );
            }
            return (
              <TestRow
                key={virtualRow.key}
                accountSlug={accountSlug}
                test={test}
                style={style}
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

function TestRow(props: {
  accountSlug: string;
  test: Test;
  style: React.CSSProperties;
}) {
  const { accountSlug, test, style } = props;
  const compactFormatter = useNumberFormatter({ notation: "compact" });
  const projectName = test.project.name;
  const rowParams = { accountSlug, projectName };
  return (
    <ListRowLink
      href={`/${accountSlug}/${projectName}/tests/${test.id}`}
      className="flex items-center gap-6 p-4 text-sm"
      style={style}
    >
      <div className="flex flex-1 gap-4 truncate">
        {test.screenshot ? (
          <DiffCard
            isActive={false}
            variant="neutral"
            className="w-28 shrink-0"
          >
            <SingleImage
              contentType={test.screenshot.contentType}
              dimensions={
                test.screenshot.width != null && test.screenshot.height != null
                  ? constraintSize(
                      {
                        width: test.screenshot.width,
                        height: test.screenshot.height,
                      },
                      DIFF_IMAGE_CONFIG,
                    )
                  : {
                      height: DIFF_IMAGE_CONFIG.defaultHeight,
                      width: DIFF_IMAGE_CONFIG.maxWidth,
                    }
              }
              url={test.screenshot.url}
            />
          </DiffCard>
        ) : null}
        <div className="flex flex-col justify-center truncate">
          <Truncable className="font-medium">{test.name}</Truncable>
          {test.buildName !== "default" ? (
            <Truncable className="text-low">{test.buildName}</Truncable>
          ) : null}
        </div>
      </div>
      <div className="w-40 truncate">
        <HeadlessLink
          href={`/${accountSlug}/${projectName}/tests`}
          className="rac-focus hover:text-default truncate underline"
        >
          {projectName}
        </HeadlessLink>
      </div>
      <div className="w-30 text-right">
        <SeenChange params={rowParams} diff={test.lastSeenDiff ?? null} />
      </div>
      <div className="flex w-20 justify-center">
        <FlakinessCircleIndicator
          value={test.metrics.all.flakiness}
          className="size-12"
        />
      </div>
      <div className="w-20 text-right tabular-nums">
        {test.metrics.all.changes}
      </div>
      <div className="w-20 text-right tabular-nums">
        {compactFormatter.format(test.metrics.all.stability * 100)}
        <small className="text-low ml-0.5">%</small>
      </div>
      <div className="w-20 text-right tabular-nums">
        {compactFormatter.format(test.metrics.all.consistency * 100)}
        <small className="text-low ml-0.5">%</small>
      </div>
    </ListRowLink>
  );
}

export function Component() {
  const params = useAccountParams();
  invariant(params, "it is an account route");
  const periodState = useTestPeriodState();
  const [filters, setFilters] = useQueryStates(filtersSchema);

  return (
    <Page>
      <Helmet>
        <title>Tests • {params.accountSlug}</title>
      </Helmet>
      <PageContainer>
        <PageHeader>
          <PageHeaderContent>
            <Heading>Tests</Heading>
            <Text slot="headline">
              View all the tests across your projects sorted by flakiness score.
            </Text>
          </PageHeaderContent>
          <PageHeaderActions>
            <PeriodSelect state={periodState} />
            <TextInputGroup className="w-64">
              <TextInputIcon>
                <SearchIcon />
              </TextInputIcon>
              <TextInput
                type="search"
                placeholder="Search tests…"
                scale="sm"
                value={filters.search ?? ""}
                onChange={(event) =>
                  setFilters({ search: event.target.value || null })
                }
              />
            </TextInputGroup>
          </PageHeaderActions>
        </PageHeader>
        <div className="relative flex-1">
          <Suspense fallback={<PageLoader />}>
            <PageContent accountSlug={params.accountSlug} />
          </Suspense>
        </div>
      </PageContainer>
    </Page>
  );
}
