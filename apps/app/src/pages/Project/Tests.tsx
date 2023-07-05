import {
  ApolloCache,
  FetchResult,
  useMutation,
  useQuery,
} from "@apollo/client";
import { useVirtualizer } from "@tanstack/react-virtual";
import { clsx } from "clsx";
import moment from "moment";
import {
  CSSProperties,
  HTMLAttributes,
  memo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";

import { FlakyButton } from "@/containers/FlakyButton";
import { MuteTestDropdown } from "@/containers/MuteTestDropdown";
import { ResolveButton } from "@/containers/ResolveButton";
import {
  SelectedTestsStateProvider,
  useSelectedTestsState,
} from "@/containers/SelectedTestsState";
import { DocumentType, graphql } from "@/gql";
import { TestStatus } from "@/gql/graphql";
import { Alert, AlertText, AlertTitle } from "@/ui/Alert";
import { Container } from "@/ui/Container";
import { FlakyChip } from "@/ui/FlakyIndicator";
import { List, ListHeader, ListRow, ListRowLoader } from "@/ui/List";
import { MuteIndicator } from "@/ui/MuteIndicator";
import { PageLoader } from "@/ui/PageLoader";
import { Time } from "@/ui/Time";
import { MagicTooltip } from "@/ui/Tooltip";

import { NotFound } from "../NotFound";

type CellProps = HTMLAttributes<HTMLDivElement>;

const Cell = ({ className, ...props }: CellProps) => (
  <div
    role="cell"
    className={clsx(
      className,
      "flex h-16 items-center justify-end whitespace-nowrap"
    )}
    {...props}
  />
);

const ProjectTestsQuery = graphql(`
  query FlakyTests_project_tests(
    $accountSlug: String!
    $projectName: String!
    $after: Int!
    $first: Int!
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      tests(first: $first, after: $after) {
        pageInfo {
          totalCount
          hasNextPage
        }
        edges {
          id
          name
          buildName
          status
          resolvedDate
          mute
          muteUntil
          stabilityScore
          lastSeen
          unstable
          dailyChanges {
            date
            count
          }
          totalBuilds
          screenshot {
            id
            url
            width
            height
          }
        }
      }
    }
  }
`);

const MuteTestsMutation = graphql(`
  mutation muteTests($ids: [String!]!, $muted: Boolean!, $muteUntil: String) {
    muteTests(ids: $ids, muted: $muted, muteUntil: $muteUntil) {
      ids
      mute
      muteUntil
    }
  }
`);

const UpdateStatusesMutation = graphql(`
  mutation updateStatusesMutation($ids: [String!]!, $status: TestStatus!) {
    updateTestStatuses(ids: $ids, status: $status) {
      ids
      status
    }
  }
`);

type ProjectTestsDocument = DocumentType<typeof ProjectTestsQuery>;
type Tests = NonNullable<ProjectTestsDocument["project"]>["tests"];
type Test = Tests["edges"][0];
type Screenshot = Tests["edges"][0]["screenshot"];

const columns = {
  graph: "w-40 hidden xl:flex",
  variations: "w-40 hidden xl:flex",
  score: "w-40 hidden xl:flex",
};

const pluralize = (count: number, singular: string, plural: string) => {
  return count < 2 ? singular : plural;
};

const Thumbnail = ({ screenshot }: { screenshot: Screenshot }) => {
  const screenshotSrc = screenshot?.url
    ? `${screenshot.url}?tr=w-${screenshot.width},h-${screenshot.height},c-at_max,dpr-2`
    : null;
  return (
    <div className="h-16 w-28 min-w-fit overflow-hidden rounded border">
      {screenshotSrc && (
        <img
          src={screenshotSrc}
          className="w-28"
          style={{
            aspectRatio: `${screenshot!.width}/${screenshot!.height}`,
          }}
        />
      )}
    </div>
  );
};

const BuildNameField = ({ buildName }: { buildName: string }) => {
  return buildName !== "default" ? (
    <div className="whitespace-nowrap">Build: {buildName}</div>
  ) : null;
};

const LastSeenField = ({ lastSeen }: { lastSeen: string | null }) => {
  return lastSeen ? (
    <MagicTooltip tooltip={`Last seen: ${moment(lastSeen).format("LLL")}`}>
      <div className="flex whitespace-nowrap">
        <Time date={lastSeen} showTitle={false} />
      </div>
    </MagicTooltip>
  ) : null;
};

const DailyVariationGraphCell = ({
  dailyChanges,
  totalBuilds,
}: {
  dailyChanges: { date: Date; count: number }[];
  totalBuilds: number;
}) => {
  return (
    <Cell className={columns.graph}>
      <div className="items-bottom flex h-8 flex-auto justify-between gap-1">
        {dailyChanges.map(({ date, count }) => {
          return (
            <MagicTooltip
              key={String(date)}
              tooltip={`${moment(date).format("LL")}: ${count} ${pluralize(
                count,
                "variation",
                "variations"
              )}`}
            >
              <div className="flex h-full w-full flex-col justify-end">
                <div
                  className="min-h-[1px] bg-neutral-100"
                  style={{
                    height: `${Math.round((count * 100) / totalBuilds)}%`,
                  }}
                />
              </div>
            </MagicTooltip>
          );
        })}
      </div>
    </Cell>
  );
};

const VariationsCell = ({
  dailyChanges,
  totalBuilds,
}: {
  dailyChanges: { date: Date; count: number }[];
  totalBuilds: number;
}) => {
  const totalChanges = dailyChanges.reduce((sum, { count }) => sum + count, 0);
  return (
    <Cell className={columns.variations}>
      <MagicTooltip
        tooltip={`Over the last 7 days: ${totalChanges} screenshot 
        ${pluralize(totalChanges, "change", "changes")} / ${totalBuilds} total 
        ${pluralize(totalBuilds, "build", "builds")}`}
      >
        <div>
          <span className="mr-2 text-lg font-bold">{totalChanges}</span> /
          <span className="ml-0.5 font-medium text-on-light">
            {totalBuilds}
          </span>
        </div>
      </MagicTooltip>
    </Cell>
  );
};

const StabilityCell = ({
  score,
  unstable,
}: {
  score: number | null;
  unstable: boolean;
}) => (
  <Cell className={columns.score}>
    <MagicTooltip
      tooltip={"A test with a stability score lower than 60 is unstable"}
    >
      <div>
        <span
          className={clsx(
            unstable ? "text-pending-400" : "",
            "mr-2 text-lg font-bold"
          )}
        >
          {score}
        </span>
        /<span className="ml-0.5">100</span>
      </div>
    </MagicTooltip>
  </Cell>
);

const TestRow = memo(
  ({ test, style }: { test: Test; style: CSSProperties }) => {
    const { testIsSelected, toggleTestSelection } = useSelectedTestsState();

    return (
      <ListRow style={style} className="p-4">
        <input
          type="checkbox"
          checked={testIsSelected(test)}
          onChange={(e) => toggleTestSelection(test, e.target.checked)}
        />
        <div className="w-95 -ml-px flex grow gap-4">
          <Thumbnail screenshot={test.screenshot} />
          <div className="flex flex-col justify-start gap-1">
            <div className="flex min-h-[1.75rem] items-start gap-2">
              <MuteIndicator test={test} />
              <div className="mr-2 line-clamp-2 font-bold">{test.name}</div>
              <FlakyChip test={test} className="-mt-0.5" />
            </div>
            <div className="flex items-center gap-4 text-sm">
              <BuildNameField buildName={test.buildName} />
              <LastSeenField lastSeen={test.lastSeen} />
            </div>
          </div>
        </div>

        <DailyVariationGraphCell
          dailyChanges={test.dailyChanges}
          totalBuilds={test.totalBuilds}
        />
        <VariationsCell
          dailyChanges={test.dailyChanges}
          totalBuilds={test.totalBuilds}
        />
        <StabilityCell
          score={test.stabilityScore ?? null}
          unstable={test.unstable}
        />
      </ListRow>
    );
  }
);

const TestsList = ({
  tests,
  fetching,
  fetchNextPage,
}: {
  tests: Tests;
  fetching: boolean;
  fetchNextPage: () => void;
}) => {
  const { accountSlug, projectName } = useParams();
  const parentRef = useRef<HTMLDivElement | null>(null);
  const { hasNextPage } = tests.pageInfo;
  const displayCount = tests.edges.length;
  const {
    selectedTests,
    selectedTestIds,
    clearTestSelection,
    onlyFlakySelected,
  } = useSelectedTestsState();

  const updateTests = (
    cache: ApolloCache<any>,
    { data }: Partial<FetchResult>
  ) => {
    if (!data) return;
    const updatedData = Object.values(data)[0];
    if (!updatedData) return;

    const {
      ids: updatedTestIds,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      __typename,
      ...updatePayload
    } = updatedData;
    if (updatedTestIds?.length === 0) return;

    let after = 0;
    const first = 20;
    while (after < tests.edges.length) {
      const query = {
        query: ProjectTestsQuery,
        variables: {
          accountSlug: accountSlug!,
          projectName: projectName!,
          first,
          after,
        },
      };
      const existingData = cache.readQuery(query);

      if (existingData?.project) {
        let edgeUpdated = false;
        const updatedEdges = existingData.project.tests.edges.map((test) => {
          if (updatedTestIds.includes(test.id)) {
            edgeUpdated = true;
            return { ...test, ...updatePayload };
          }
          return test;
        });

        if (edgeUpdated) {
          cache.writeQuery({
            ...query,
            data: {
              ...existingData,
              project: {
                ...existingData.project,
                tests: {
                  ...existingData.project.tests,
                  edges: updatedEdges,
                },
              },
            },
          });
        }
      }

      after += first;
    }
  };

  const [muteTests, { loading: muteLoading }] = useMutation(MuteTestsMutation, {
    update: (cache, { data }) => updateTests(cache, { data: data }),
  });

  const [updateStatuses, { loading: updateStatusesLoading }] = useMutation(
    UpdateStatusesMutation,
    { update: (cache, { data }) => updateTests(cache, { data: data }) }
  );

  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? displayCount + 1 : displayCount,
    estimateSize: () => 97,
    getScrollElement: () => parentRef.current,
    overscan: 20,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const lastItem = virtualItems[virtualItems.length - 1];
  useEffect(() => {
    if (
      lastItem &&
      lastItem.index === displayCount &&
      hasNextPage &&
      !fetching
    ) {
      fetchNextPage();
    }
  }, [lastItem, hasNextPage, fetching, fetchNextPage, displayCount]);

  return (
    <List className="absolute max-h-full w-full overflow-hidden">
      <ListHeader className="flex gap-4 px-4 py-2">
        <div className="w-3" />
        <div className="flex flex-1 items-center gap-4">
          <FlakyButton
            disabled={selectedTests.length === 0 || updateStatusesLoading}
            onlyFlakySelected={onlyFlakySelected}
            onClick={() => {
              updateStatuses({
                variables: {
                  ids: selectedTestIds,
                  status: onlyFlakySelected
                    ? TestStatus.Pending
                    : TestStatus.Flaky,
                },
              });
              clearTestSelection();
            }}
          />
          <ResolveButton
            disabled={
              selectedTests.length === 0 ||
              updateStatusesLoading ||
              !onlyFlakySelected
            }
            onClick={() => {
              updateStatuses({
                variables: {
                  ids: selectedTestIds,
                  status: TestStatus.Resolved,
                },
              });
              clearTestSelection();
            }}
          />
          <MuteTestDropdown
            disabled={selectedTests.length === 0 || muteLoading}
            onlyUnmuteSelected={selectedTests.every((test) => !test.mute)}
            onClick={({
              muted,
              muteUntil,
            }: {
              muted: boolean;
              muteUntil: string | null;
            }) => {
              const ids = selectedTestIds as [string];
              muteTests({ variables: { ids, muted, muteUntil } });
              clearTestSelection();
            }}
          />
        </div>

        <MagicTooltip tooltip="Screenshot variations over the last 7 days">
          <div
            role="columnheader"
            className={clsx(columns.graph, "flex items-center")}
          >
            Graph
          </div>
        </MagicTooltip>
        <MagicTooltip tooltip="Screenshot variations out of the total number of builds over the last 7 days">
          <div
            role="columnheader"
            className={clsx(
              columns.variations,
              "flex items-center justify-end"
            )}
          >
            Variations
          </div>
        </MagicTooltip>
        <MagicTooltip tooltip="Higher scores indicating greater stability over the last 7 days">
          <div
            role="columnheader"
            className={clsx(columns.score, "flex items-center justify-end")}
          >
            Stability score
          </div>
        </MagicTooltip>
      </ListHeader>

      <div ref={parentRef} className="min-h-0 flex-1 overflow-auto">
        <div
          style={{
            height: rowVirtualizer.getTotalSize(),
            position: "relative",
          }}
        >
          {virtualItems.map((virtualRow) => {
            const test = tests.edges[virtualRow.index];
            if (!test) {
              return (
                <ListRowLoader
                  key={`loader-${virtualRow.index}`}
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
                key={`test-${test.id}`}
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
};

const PageContent = (props: { accountSlug: string; projectName: string }) => {
  const testsResult = useQuery(ProjectTestsQuery, {
    variables: {
      accountSlug: props.accountSlug,
      projectName: props.projectName,
      after: 0,
      first: 20,
    },
  });
  const { fetchMore } = testsResult;
  const testResultRef = useRef(testsResult);
  testResultRef.current = testsResult;
  if (testsResult.error) {
    throw testsResult.error;
  }

  const fetchNextPage = useCallback(() => {
    const displayCount =
      testResultRef.current.data?.project?.tests.edges.length;
    fetchMore({
      variables: {
        after: displayCount,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        return {
          ...prev,
          project: {
            ...prev.project!,
            tests: {
              ...prev.project!.tests,
              ...fetchMoreResult.project!.tests,
              edges: [
                ...prev.project!.tests.edges,
                ...fetchMoreResult.project!.tests.edges,
              ],
            },
          },
        };
      },
    });
  }, [fetchMore]);

  if (!testsResult.data) {
    return (
      <Container>
        <PageLoader />
      </Container>
    );
  }

  const tests = testsResult.data.project?.tests;
  if (!tests) {
    return (
      <Container>
        <NotFound />
      </Container>
    );
  }

  if (tests.pageInfo.totalCount === 0) {
    return (
      <Container>
        <Alert>
          <AlertTitle>No test</AlertTitle>
          <AlertText>There is no test on this project yet.</AlertText>
        </Alert>
      </Container>
    );
  }

  return (
    <SelectedTestsStateProvider>
      <Container className="flex flex-1">
        <div className="relative flex-1">
          <TestsList
            tests={tests}
            fetchNextPage={fetchNextPage}
            fetching={testsResult.loading}
          />
        </div>
      </Container>
    </SelectedTestsStateProvider>
  );
};

export const Tests = () => {
  const { accountSlug, projectName } = useParams();
  if (!accountSlug || !projectName) {
    return <NotFound />;
  }

  return (
    <>
      <Helmet>
        <title>
          {accountSlug}/{projectName} • Tests
        </title>
      </Helmet>
      <PageContent accountSlug={accountSlug} projectName={projectName} />
    </>
  );
};
