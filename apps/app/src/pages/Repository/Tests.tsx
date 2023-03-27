import {
  ApolloCache,
  FetchResult,
  useMutation,
  useQuery,
} from "@apollo/client";
import { useVirtualizer } from "@tanstack/react-virtual";
import { clsx } from "clsx";
import moment from "moment";
import { memo, useCallback, useEffect, useRef } from "react";
import { Helmet } from "react-helmet";
import { Link as RouterLink, useParams } from "react-router-dom";

import { FlakyButton } from "@/containers/FlakyButton";
import { MuteTestDropdown } from "@/containers/MuteTestDropdown";
import { ResolveButton } from "@/containers/ResolveButton";
import { DocumentType, graphql } from "@/gql";
import { TestStatus } from "@/gql/graphql";
import { Alert, AlertActions, AlertText, AlertTitle } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Container } from "@/ui/Container";
import { FlakyChip } from "@/ui/FlakyIndicator";
import {
  ListCell,
  ListHeader,
  ListHeaders,
  ListLoader,
  ListRow,
} from "@/ui/List";
import { MuteIndicator } from "@/ui/MuteIndicator";
import { PageLoader } from "@/ui/PageLoader";
import { Time } from "@/ui/Time";
import { MagicTooltip } from "@/ui/Tooltip";

import { NotFound } from "../NotFound";
import {
  SelectedTestsStateProvider,
  useSelectedTestsState,
} from "./SelectedTestsState";

const RepositoryTestsQuery = graphql(`
  query FlakyTests_repository_tests(
    $ownerLogin: String!
    $repositoryName: String!
    $after: Int!
    $first: Int!
  ) {
    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {
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

type RepositoryTestsDocument = DocumentType<typeof RepositoryTestsQuery>;
type Tests = NonNullable<RepositoryTestsDocument["repository"]>["tests"];
type Test = Tests["edges"][0];
type Screenshot = Tests["edges"][0]["screenshot"];

const secondaryColumnClassNames: string[] = [
  "w-40 hidden xl:flex",
  "w-24 hidden lg:flex",
  "w-32",
];

const pluralize = (count: number, singular: string, plural: string) => {
  return count < 2 ? singular : plural;
};

const Thumbnail = ({ screenshot }: { screenshot: Screenshot }) => {
  const screenshotSrc = screenshot?.url
    ? `${screenshot.url}?tr=w-${screenshot.width},h-${screenshot.height},c-at_max,dpr-2`
    : null;
  return (
    <div className="h-16 w-28 min-w-fit overflow-hidden rounded border border-border">
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
    <ListCell className={secondaryColumnClassNames[0]}>
      <div className="items-bottom flex h-8 flex-auto justify-between gap-1">
        {dailyChanges.map(({ date, count }) => {
          const heightClassName = `h-[${Math.round(
            (count * 100) / totalBuilds
          )}%]`;

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
                  className={clsx(
                    heightClassName,
                    "min-h-[1px] bg-neutral-100"
                  )}
                />
              </div>
            </MagicTooltip>
          );
        })}
      </div>
    </ListCell>
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
    <ListCell className={secondaryColumnClassNames[1]}>
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
    </ListCell>
  );
};

const StabilityCell = ({
  score,
  unstable,
}: {
  score: number | null;
  unstable: boolean;
}) => (
  <ListCell className={secondaryColumnClassNames[2]}>
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
  </ListCell>
);

const TestRow = memo(({ test }: { test: Test }) => {
  const { testIsSelected, toggleTestSelection } = useSelectedTestsState();

  return (
    <ListRow>
      <input
        type="checkbox"
        checked={testIsSelected(test)}
        onChange={(e) => toggleTestSelection(test, e.target.checked)}
      />
      <div className="w-95 flex grow gap-4">
        <Thumbnail screenshot={test.screenshot} />
        <div className="flex flex-col justify-start gap-1">
          <div className="flex min-h-[1.75rem] items-start gap-2">
            <MuteIndicator test={test} />
            <div className="mr-2 font-bold line-clamp-2">{test.name}</div>
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
});

const TestsList = ({
  tests,
  fetching,
  fetchNextPage,
}: {
  tests: Tests;
  fetching: boolean;
  fetchNextPage: () => void;
}) => {
  const { ownerLogin, repositoryName } = useParams();
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
        query: RepositoryTestsQuery,
        variables: {
          ownerLogin: ownerLogin!,
          repositoryName: repositoryName!,
          first,
          after,
        },
      };
      const existingData = cache.readQuery(query);

      if (existingData?.repository) {
        let edgeUpdated = false;
        const updatedEdges = existingData.repository.tests.edges.map((test) => {
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
              repository: {
                ...existingData.repository,
                tests: {
                  ...existingData.repository.tests,
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
    estimateSize: () => 81,
    getScrollElement: () => parentRef.current,
    overscan: 20,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const lastItem = virtualItems[virtualItems.length - 1];
  useEffect(() => {
    if (
      lastItem &&
      lastItem.index >= displayCount - 1 &&
      hasNextPage &&
      !fetching
    ) {
      fetchNextPage();
    }
  }, [lastItem, hasNextPage, fetching, fetchNextPage, displayCount]);

  return (
    <div className="flex min-h-0 flex-1 basis-0 flex-col rounded border border-border">
      <ListHeaders>
        <ListHeader className="w-3" />
        <div className="flex flex-auto gap-4">
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

        <ListHeader className={clsx(secondaryColumnClassNames[0], "")}>
          <MagicTooltip tooltip="Screenshot variations over the last 7 days">
            <div>Graph</div>
          </MagicTooltip>
        </ListHeader>
        <ListHeader
          className={clsx(secondaryColumnClassNames[1], "justify-end")}
        >
          <MagicTooltip tooltip="Screenshot variations out of the total number of builds over the last 7 days">
            <div>Variations</div>
          </MagicTooltip>
        </ListHeader>
        <ListHeader
          className={clsx(secondaryColumnClassNames[2], "justify-end")}
        >
          <MagicTooltip tooltip="Higher scores indicating greater stability over the last 7 days">
            <div>Stability score</div>
          </MagicTooltip>
        </ListHeader>
      </ListHeaders>

      <div ref={parentRef} className="overflow-auto">
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
                <div
                  key={`loader-${virtualRow.index}`}
                  className="flex items-center justify-center gap-2 text-sm text-on-light"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <ListLoader />
                </div>
              );
            }
            return (
              <div
                key={`test-${test.id}`}
                className="group"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <TestRow test={test} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const PageContent = (props: { ownerLogin: string; repositoryName: string }) => {
  const testsResult = useQuery(RepositoryTestsQuery, {
    variables: {
      ownerLogin: props.ownerLogin,
      repositoryName: props.repositoryName,
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
      testResultRef.current.data?.repository?.tests.edges.length;
    fetchMore({
      variables: {
        after: displayCount,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        return {
          ...prev,
          repository: {
            ...prev.repository!,
            tests: {
              ...prev.repository!.tests,
              ...fetchMoreResult.repository!.tests,
              edges: [
                ...prev.repository!.tests.edges,
                ...fetchMoreResult.repository!.tests.edges,
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

  const tests = testsResult.data.repository?.tests;
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
          <AlertText>There is no test yet on this repository.</AlertText>
          <AlertActions>
            <Button>
              {(buttonProps) => (
                <RouterLink to="/" {...buttonProps}>
                  Back to home
                </RouterLink>
              )}
            </Button>
          </AlertActions>
        </Alert>
      </Container>
    );
  }

  return (
    <SelectedTestsStateProvider>
      <div className="container mx-auto flex min-h-0 flex-1 basis-0 flex-col p-4">
        <TestsList
          tests={tests}
          fetchNextPage={fetchNextPage}
          fetching={testsResult.loading}
        />
      </div>
    </SelectedTestsStateProvider>
  );
};

export const Tests = () => {
  const { ownerLogin, repositoryName } = useParams();
  if (!ownerLogin || !repositoryName) {
    return <NotFound />;
  }

  return (
    <>
      <Helmet>
        <title>
          {ownerLogin}/{repositoryName} • Tests
        </title>
      </Helmet>
      <PageContent ownerLogin={ownerLogin} repositoryName={repositoryName} />
    </>
  );
};
