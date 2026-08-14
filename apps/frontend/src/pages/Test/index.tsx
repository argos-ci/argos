import { useDeferredValue } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import clsx from "clsx";
import {
  CircleCheckIcon,
  FlagOffIcon,
  PartyPopperIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useQueryState } from "nuqs";
import { Helmet } from "react-helmet";

import { BuildDiffDetail } from "@/containers/Build/BuildDiffDetail";
import { BuildDiffDetailToolbar } from "@/containers/Build/BuildDiffDetailToolbar";
import { BuildDiffHighlighterProvider } from "@/containers/Build/BuildDiffHighlighterContext";
import {
  DiffCard,
  DiffCardFooter,
  DiffCardFooterText,
  DiffImage,
  ListItemButton,
} from "@/containers/Build/BuildDiffListPrimitives";
import { CommentsEnabledContext } from "@/containers/Build/CommentsContext";
import { IgnoreButton } from "@/containers/Build/toolbar/IgnoreButton";
import {
  NextButton,
  PreviousButton,
} from "@/containers/Build/toolbar/NavButtons";
import { ZoomerSyncProvider } from "@/containers/Build/Zoomer";
import { PeriodSelect } from "@/containers/PeriodSelect";
import { ProjectIgnoreEnabledProvider } from "@/containers/Project/IgnoreContext";
import { ProjectPermissionsContext } from "@/containers/Project/PermissionsContext";
import { ProjectRepositoryProvider } from "@/containers/Project/RepositoryContext";
import {
  useTestPeriodState,
  type TestMetricPeriodState,
} from "@/containers/Test/Period";
import { SeenChange } from "@/containers/Test/SeenChange";
import { TestStatusIndicator } from "@/containers/TestStatusIndicator";
import { graphql, type DocumentType } from "@/gql";
import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { Heading } from "@/ui/Heading";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateIcon,
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
import { Panel } from "@/ui/Panel";
import { Separator } from "@/ui/Separator";
import { Text } from "@/ui/Text";
import { Tooltip } from "@/ui/Tooltip";
import useViewportSize from "@/ui/useViewportSize";
import { compactNumberFormatter } from "@/util/intl";

import { NotFound } from "../NotFound";
import { ActivitySection } from "./ActivitySection";
import { ChangeHistorySection } from "./ChangeHistorySection";
import { ChangesChart } from "./ChangesChart";
import {
  ChangesFilterToggle,
  getChangesFilterIgnored,
  useChangesFilterState,
  type ChangesFilterState,
} from "./ChangesFilter";
import { Counter, CounterLabel, CounterValue } from "./Counter";
import { FixFlakinessSection } from "./FixFlakinessSection";
import { useTestParams, type TestSearchParams } from "./TestParams";
import {
  BuildsCounter,
  ChangesCounter,
  ConsistencyCounter,
  FlakinessGauge,
  StabilityCounter,
} from "./Widgets";

const TestQuery = graphql(`
  query TestPage_Project(
    $accountSlug: String!
    $projectName: String!
    $testId: ID!
    $period: MetricsPeriod!
    $ignored: Boolean
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      permissions
      repository {
        id
        url
      }
      ignoreConfig {
        enabled
      }
      test(id: $testId) {
        id
        name
        status
        ...ChangeHistorySection_Test
        ...FixFlakinessSection_Test
        ...TestActivity_Test
        changes(period: $period, after: 0, first: 30, ignored: $ignored) {
          edges {
            ...TestChangeFragment
          }
        }
        globalMetrics: metrics {
          all {
            total
            changes
          }
        }
        metrics(period: $period) {
          series {
            ts
            total
            changes
            uniqueChanges
          }
          all {
            total
            changes
            uniqueChanges
            stability
            consistency
            flakiness
          }
        }
      }
    }
  }
`);

export function Component() {
  const params = useTestParams();
  invariant(params, "Can't be used outside of a test route");
  const periodState = useTestPeriodState();
  const filterState = useChangesFilterState();
  const deferredPeriodValue = useDeferredValue(periodState.value);
  const deferredFilterValue = useDeferredValue(filterState.value);
  const isPeriodPending = periodState.value !== deferredPeriodValue;
  // The filter only narrows the changes list, so it leaves the metrics alone.
  const areChangesPending =
    isPeriodPending || filterState.value !== deferredFilterValue;
  const period = periodState.definition[deferredPeriodValue];
  const { data } = useSuspenseQuery(TestQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
      testId: params.testId,
      period: deferredPeriodValue,
      ignored: getChangesFilterIgnored(deferredFilterValue),
    },
  });

  const project = data.project;
  const test = project?.test;

  if (!test) {
    return <NotFound />;
  }

  const periodLabel =
    periodState.definition[periodState.value].label.toLowerCase();

  return (
    <Page>
      <PageContainer>
        <PageHeader>
          <PageHeaderContent>
            <Helmet>
              <title>
                {test.id} • {test.name}
              </title>
            </Helmet>
            <Heading className="text-lg!">{test.name}</Heading>
            <div className="text-low text-sm">
              <TestStatusIndicator status={test.status} />
            </div>
          </PageHeaderContent>
        </PageHeader>
        <ProjectPermissionsContext value={project.permissions}>
          <ProjectRepositoryProvider url={project.repository?.url ?? null}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="flex min-w-0 flex-1 flex-col gap-10">
                <div className="flex flex-col items-start gap-4 self-stretch">
                  <PeriodSelect state={periodState} />
                  {/* The counters size to their content and the chart takes the
                    rest, so the chart keeps as much width as the column has to
                    spare. */}
                  <div
                    className={clsx(
                      "flex flex-col gap-4 self-stretch lg:flex-row",
                      isPeriodPending && "animate-pulse",
                    )}
                  >
                    <Panel>
                      <div className="flex flex-wrap items-center gap-3 gap-y-6 px-4">
                        <FlakinessGauge value={test.metrics.all.flakiness} />
                        <div className="flex flex-col justify-between self-stretch">
                          <BuildsCounter
                            value={test.metrics.all.total}
                            periodLabel={periodLabel}
                          />
                          <ChangesCounter
                            value={test.metrics.all.changes}
                            periodLabel={periodLabel}
                          />
                        </div>
                        <div className="flex flex-col justify-between self-stretch">
                          <StabilityCounter
                            value={test.metrics.all.stability}
                          />
                          <ConsistencyCounter
                            value={test.metrics.all.consistency}
                          />
                        </div>
                      </div>
                    </Panel>
                    <Panel className="flex min-w-0 flex-1 items-center">
                      <ChangesChart
                        className="h-22 min-w-0 flex-1 px-4"
                        series={test.metrics.series}
                        from={period.from}
                      />
                    </Panel>
                  </div>
                </div>
                {/* The title and the filter label the card rather than sit in it,
                  so `px-4` keeps both ends aligned with its content. */}
                <div
                  className={clsx(
                    "flex flex-col gap-2",
                    areChangesPending && "animate-pulse",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pl-4">
                    <Heading level={2} className="font-medium">
                      {filterState.value === "ignored"
                        ? "Ignored changes"
                        : "Changes"}{" "}
                      <span className="text-low">over the {periodLabel}</span>
                    </Heading>
                    <ChangesFilterToggle state={filterState} />
                  </div>
                  <Panel spacing={false}>
                    <ProjectIgnoreEnabledProvider
                      enabled={project.ignoreConfig.enabled}
                    >
                      <ChangesExplorer
                        test={test}
                        periodState={periodState}
                        filterState={filterState}
                      />
                    </ProjectIgnoreEnabledProvider>
                  </Panel>
                </div>
              </div>
              <div className="flex w-full shrink-0 flex-col gap-4 xl:w-80">
                <ChangeHistorySection test={test} params={params} />
                {/* The prompt quotes the metrics, so it labels itself with the
                  period they were fetched for, not the one being switched to. */}
                <FixFlakinessSection
                  test={test}
                  period={deferredPeriodValue}
                  periodLabel={period.label.toLowerCase()}
                />
                <ActivitySection test={test} />
              </div>
            </div>
          </ProjectRepositoryProvider>
        </ProjectPermissionsContext>
      </PageContainer>
    </Page>
  );
}

type TestDocument = NonNullable<
  NonNullable<DocumentType<typeof TestQuery>["project"]>["test"]
>;

const _ChangesFragment = graphql(`
  fragment TestChangeFragment on TestChange {
    id
    ignored
    stats(period: $period) {
      totalOccurrences
      lastSeenDiff {
        id
        createdAt
        status
        width
        height
        url
        compareScreenshot {
          id
          width
          height
          url
        }
        baseScreenshot {
          id
          width
          height
          url
        }
        build {
          id
          number
          ...BuildDiffDetail_Build
        }
        ...BuildDiffState_ScreenshotDiff
        ...ScreenChange_ScreenshotDiff
      }
      firstSeenDiff {
        ...ScreenChange_ScreenshotDiff
      }
    }
  }
`);

type TestChangeDocument = DocumentType<typeof _ChangesFragment>;

const CHANGE_PARAM = "change" satisfies keyof TestSearchParams;

function useActiveChange(props: { test: TestDocument }) {
  const defaultChange = props.test.changes.edges[0] ?? null;
  const [activeChangeId, setActiveChangeId] = useQueryState(CHANGE_PARAM, {
    defaultValue: defaultChange?.id ?? "",
  });
  const activeChange =
    props.test.changes.edges.find((change) => change.id === activeChangeId) ??
    defaultChange;
  return [activeChange, setActiveChangeId] as const;
}

/**
 * Vertical space the explorer has to leave to what sits above it: the page
 * header, the section title above the card, and the vertical padding of the card
 * itself.
 */
const EXPLORER_TOP_OFFSET = 180;

/**
 * Floor for the explorer's height, so a viewport shorter than the offset (a
 * short split pane, a phone with the keyboard up) still leaves the two columns
 * something to scroll rather than collapsing them to nothing.
 */
const EXPLORER_MIN_HEIGHT = 240;

function ChangesExplorer(props: {
  test: TestDocument;
  periodState: TestMetricPeriodState;
  filterState: ChangesFilterState;
}) {
  const { test, periodState, filterState } = props;
  const [activeChange, setActiveChangeId] = useActiveChange({ test });
  const viewportSize = useViewportSize();
  const height = Math.max(
    EXPLORER_MIN_HEIGHT,
    viewportSize.height - EXPLORER_TOP_OFFSET,
  );
  const periodLabel =
    periodState.definition[periodState.value].label.toLowerCase();
  if (test.changes.edges.length === 0) {
    return (
      <>
        {filterState.value === "ignored" ? (
          <EmptyState>
            <EmptyStateIcon>
              <FlagOffIcon strokeWidth={1} />
            </EmptyStateIcon>
            <Heading>No ignored changes</Heading>
            <Text slot="description">
              No ignored change showed up in this test over the {periodLabel}.
              Widen the period to look further back, or ignore a change from its
              toolbar when it keeps coming back without anything really
              changing.
            </Text>
            <EmptyStateActions>
              <Button
                variant="secondary"
                onPress={() => filterState.setValue("all")}
              >
                See all changes
              </Button>
            </EmptyStateActions>
          </EmptyState>
        ) : (
          <EmptyState>
            <EmptyStateIcon>
              <PartyPopperIcon />
            </EmptyStateIcon>
            <Heading>No changes</Heading>
            <Text slot="description">
              This test remained unchanged over the {periodLabel}.
            </Text>
          </EmptyState>
        )}
      </>
    );
  }
  return (
    // The surrounding panel provides the card; this only lays the two sides out
    // and gives the scrollable columns a height to work against.
    <div className="flex" style={{ height }}>
      <div className="border-r-thin flex min-w-60">
        <ChangesList
          test={test}
          onSelect={setActiveChangeId}
          activeChange={activeChange}
        />
      </div>
      {activeChange && (
        <ZoomerSyncProvider id={activeChange.stats.lastSeenDiff.build.id}>
          <BuildDiffHighlighterProvider>
            {/* Comments belong to a build review, not to the test trends view. */}
            <CommentsEnabledContext value={false}>
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="border-b-thin sticky top-0 z-20 shrink-0 p-2">
                  <BuildHeader
                    change={activeChange}
                    test={test}
                    onActiveTestChange={setActiveChangeId}
                  />
                </div>
                <BuildDiffDetail
                  build={activeChange.stats.lastSeenDiff.build}
                  diff={activeChange.stats.lastSeenDiff}
                  repoUrl={null}
                />
              </div>
            </CommentsEnabledContext>
          </BuildDiffHighlighterProvider>
        </ZoomerSyncProvider>
      )}
    </div>
  );
}

function BuildHeader(props: {
  change: TestChangeDocument;
  test: TestDocument;
  onActiveTestChange: (changeId: string) => void;
}) {
  const { change, test, onActiveTestChange } = props;
  const params = useTestParams();
  invariant(params, "Can't be used outside of a test route");

  const changeIndex = test.changes.edges.findIndex((c) => c.id === change.id);
  const previousChange = test.changes.edges[changeIndex - 1];
  const nextChange = test.changes.edges[changeIndex + 1];
  const goToPreviousDiff = () => {
    if (previousChange) {
      onActiveTestChange(previousChange.id);
    }
  };
  const goToNextDiff = () => {
    if (nextChange) {
      onActiveTestChange(nextChange.id);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex shrink-0 gap-1">
        <PreviousButton
          onPress={goToPreviousDiff}
          isDisabled={!previousChange}
        />
        <NextButton onPress={goToNextDiff} isDisabled={!nextChange} />
      </div>
      <BuildDiffDetailToolbar diff={change.stats.lastSeenDiff}>
        <IgnoreButton diff={change.stats.lastSeenDiff} />
      </BuildDiffDetailToolbar>
      {/* A line of its own, under the controls: these are facts about the
          change, and squeezing them onto the row that also carries the
          arrows and the toolbar left them wrapping mid-phrase. */}
      <div className="flex min-w-0 basis-full flex-wrap items-center gap-3 xl:gap-4">
        <Counter>
          <Tooltip
            content={
              <>
                Number of auto-approved builds in which this exact diff
                reappears. A value {">"} 1 flags potential flakiness, showing
                the change isn’t a one-off but a recurring issue.
              </>
            }
          >
            <CounterLabel>Occurrences</CounterLabel>
          </Tooltip>
          <CounterValue
            className={clsx(
              "tabular-nums",
              change.stats.totalOccurrences > 1
                ? "text-danger-low"
                : "text-success-low",
            )}
          >
            {compactNumberFormatter.format(change.stats.totalOccurrences)}{" "}
            <small>
              / {compactNumberFormatter.format(test.metrics.all.total)}
            </small>
          </CounterValue>
        </Counter>
        <Separator
          className="self-stretch max-lg:hidden"
          orientation="vertical"
        />
        <div className="flex gap-x-6 gap-y-0.5">
          <SeenChange
            title="First seen"
            diff={change.stats.firstSeenDiff}
            params={params}
          />
          <SeenChange
            title="Last seen"
            diff={change.stats.lastSeenDiff}
            params={params}
          />
        </div>
      </div>
    </div>
  );
}

const DIFF_IMAGE_CONFIG = {
  maxWidth: 240,
  maxHeight: 300,
  defaultHeight: 300,
};

function ChangesList(props: {
  test: TestDocument;
  activeChange: TestChangeDocument | null;
  onSelect: (diffId: string) => void;
}) {
  const { test, onSelect, activeChange } = props;
  return (
    <div
      role="region"
      aria-label="Changes"
      className="group/sidebar flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4"
    >
      {test.changes.edges.map((change) => {
        const isActive = activeChange?.id === change.id;
        return (
          <ListItemButton key={change.id} onPress={() => onSelect(change.id)}>
            <DiffCard isActive={isActive} variant="primary">
              <DiffImage
                diff={change.stats.lastSeenDiff}
                config={DIFF_IMAGE_CONFIG}
              />
              {/* Always visible, unlike the footer: whether a change is ignored
                  has to be readable while scanning the list, not on hover. */}
              {change.ignored ? (
                <Tooltip content="Ignored change: Argos skips it when it reappears in a build.">
                  <Chip
                    color="neutral"
                    scale="xs"
                    icon={FlagOffIcon}
                    className="absolute top-1.5 left-1.5 z-10"
                  >
                    Ignored
                  </Chip>
                </Tooltip>
              ) : null}
              <DiffCardFooter>
                <DiffCardFooterText>
                  {change.stats.totalOccurrences > 1 ? (
                    <>
                      <TriangleAlertIcon className="text-danger-low mr-1 inline size-3" />
                      Recurring -{" "}
                      {compactNumberFormatter.format(
                        change.stats.totalOccurrences,
                      )}
                      <small>x</small>
                    </>
                  ) : (
                    <>
                      <CircleCheckIcon className="text-success-low mr-1 inline size-3" />
                      One-off
                    </>
                  )}
                </DiffCardFooterText>
              </DiffCardFooter>
            </DiffCard>
          </ListItemButton>
        );
      })}
    </div>
  );
}
