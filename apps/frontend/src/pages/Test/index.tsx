import { useDeferredValue } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import clsx from "clsx";
import {
  CircleCheckIcon,
  PartyPopperIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useNumberFormatter } from "react-aria";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";
import { useSearchParams } from "react-router-dom";

import { BuildDiffDetail } from "@/containers/Build/BuildDiffDetail";
import { BuildDiffDetailToolbar } from "@/containers/Build/BuildDiffDetailToolbar";
import {
  DiffCard,
  DiffCardFooter,
  DiffCardFooterText,
  DiffImage,
  ListItemButton,
} from "@/containers/Build/BuildDiffListPrimitives";
import { IgnoreButton } from "@/containers/Build/toolbar/IgnoreButton";
import {
  NextButton,
  PreviousButton,
} from "@/containers/Build/toolbar/NavButtons";
import {
  PeriodSelect,
  type TestMetricPeriodState,
} from "@/containers/PeriodSelect";
import { ProjectPermissionsContext } from "@/containers/Project/PermissionsContext";
import { useTestPeriodState } from "@/containers/Test/Period";
import { SeenChange } from "@/containers/Test/SeenChange";
import { TestStatusIndicator } from "@/containers/TestStatusIndicator";
import { graphql, type DocumentType } from "@/gql";
import {
  EmptyState,
  EmptyStateIcon,
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
import { Separator } from "@/ui/Separator";
import { Tooltip } from "@/ui/Tooltip";
import { useEventCallback } from "@/ui/useEventCallback";
import useViewportSize from "@/ui/useViewportSize";

import { NotFound } from "../NotFound";
import { ChangesChart } from "./ChangesChart";
import { Counter, CounterLabel, CounterValue } from "./Counter";
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
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      permissions
      test(id: $testId) {
        id
        name
        status
        firstSeenDiff {
          ...ScreenChange_ScreenshotDiff
        }
        lastSeenDiff {
          ...ScreenChange_ScreenshotDiff
        }
        changes(period: $period, after: 0, first: 30) {
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
  const deferredPeriodValue = useDeferredValue(periodState.value);
  const isPending = periodState.value !== deferredPeriodValue;
  const period = periodState.definition[deferredPeriodValue];
  const { data } = useSuspenseQuery(TestQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
      testId: params.testId,
      period: deferredPeriodValue,
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
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-start gap-2">
            <PeriodSelect state={periodState} />
            <div
              className={clsx(
                "bg-app @container flex flex-col gap-2 self-stretch rounded-md border p-2 pr-6",
                isPending && "animate-pulse",
              )}
            >
              <div className="flex items-center gap-6">
                <div className="flex flex-1 flex-wrap items-center gap-3 gap-y-6 py-2">
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
                    <StabilityCounter value={test.metrics.all.stability} />
                    <ConsistencyCounter value={test.metrics.all.consistency} />
                  </div>
                  <ChangesChart
                    className="max-w- h-22 min-w-0 flex-1"
                    series={test.metrics.series}
                    from={period.from}
                  />
                </div>
                <Separator className="self-stretch" orientation="vertical" />
                <div className="flex flex-col gap-2">
                  <SeenChange
                    title="First change"
                    params={params}
                    diff={test.firstSeenDiff ?? null}
                  />
                  <SeenChange
                    title="Last change"
                    params={params}
                    diff={test.lastSeenDiff ?? null}
                  />
                </div>
              </div>
            </div>
          </div>
          <div
            className={clsx(
              "flex flex-col gap-2",
              isPending && "animate-pulse",
            )}
          >
            <Heading level={2} className="pl-4 font-medium">
              Changes{" "}
              <span className="text-low">
                over the{" "}
                {periodState.definition[periodState.value].label.toLowerCase()}
              </span>
            </Heading>
            <ProjectPermissionsContext value={project.permissions}>
              <ChangesExplorer test={test} periodState={periodState} />
            </ProjectPermissionsContext>
          </div>
        </div>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const activeDiffIdParam = searchParams.get(CHANGE_PARAM);
  const defaultChange = props.test.changes.edges[0] ?? null;
  const activeChange =
    props.test.changes.edges.find(
      (change) => change.id === activeDiffIdParam,
    ) ?? defaultChange;
  const setActiveChangeId = useEventCallback((changeId: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (changeId === defaultChange?.id) {
        newParams.delete(CHANGE_PARAM);
      } else {
        newParams.set(CHANGE_PARAM, changeId);
      }
      return newParams;
    });
  });
  return [activeChange, setActiveChangeId] as const;
}

function ChangesExplorer(props: {
  test: TestDocument;
  periodState: TestMetricPeriodState;
}) {
  const { test, periodState } = props;
  const [activeChange, setActiveChangeId] = useActiveChange({ test });
  const viewportSize = useViewportSize();
  const height = viewportSize.height - 160;
  if (test.changes.edges.length === 0) {
    return (
      <div className="bg-app rounded-lg border">
        <EmptyState>
          <EmptyStateIcon>
            <PartyPopperIcon />
          </EmptyStateIcon>
          <Heading>No changes</Heading>
          <Text slot="description">
            This test remained unchanged over the{" "}
            {periodState.definition[periodState.value].label.toLowerCase()}.
          </Text>
        </EmptyState>
      </div>
    );
  }
  return (
    <div className="bg-app flex gap-4 rounded-lg border" style={{ height }}>
      <div className="flex min-w-60 border-r">
        <ChangesList
          test={test}
          onSelect={setActiveChangeId}
          activeChange={activeChange}
        />
      </div>
      {activeChange && (
        <BuildDiffDetail
          build={activeChange.stats.lastSeenDiff.build}
          diff={activeChange.stats.lastSeenDiff}
          repoUrl={null}
          header={
            <BuildHeader
              change={activeChange}
              test={test}
              onActiveTestChange={setActiveChangeId}
            />
          }
        />
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

  const compactFormatter = useNumberFormatter({ notation: "compact" });

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
    <div className="flex flex-wrap items-start justify-between gap-4 has-[[data-meta]:empty]:items-center">
      <div className="flex shrink-0 gap-1">
        <PreviousButton
          onPress={goToPreviousDiff}
          isDisabled={!previousChange}
        />
        <NextButton onPress={goToNextDiff} isDisabled={!nextChange} />
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 max-2xl:order-[-1] max-2xl:basis-full max-2xl:border-b max-2xl:pb-4 xl:gap-4">
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
            {compactFormatter.format(change.stats.totalOccurrences)}{" "}
            <small>/ {compactFormatter.format(test.metrics.all.total)}</small>
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
      <BuildDiffDetailToolbar diff={change.stats.lastSeenDiff}>
        <IgnoreButton diff={change.stats.lastSeenDiff} />
      </BuildDiffDetailToolbar>
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
  const compactFormatter = useNumberFormatter({
    notation: "compact",
  });
  return (
    <div className="group/sidebar flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      {test.changes.edges.map((change) => {
        const isActive = activeChange?.id === change.id;
        return (
          <ListItemButton key={change.id} onPress={() => onSelect(change.id)}>
            <DiffCard isActive={isActive} variant="primary">
              <DiffImage
                diff={change.stats.lastSeenDiff}
                config={DIFF_IMAGE_CONFIG}
              />
              <DiffCardFooter>
                <DiffCardFooterText>
                  {change.stats.totalOccurrences > 1 ? (
                    <>
                      <TriangleAlertIcon className="text-danger-low mr-1 inline size-3" />
                      Recurring -{" "}
                      {compactFormatter.format(change.stats.totalOccurrences)}
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
