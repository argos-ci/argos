import type { ComponentProps } from "react";
import { useSuspenseQuery } from "@apollo/client";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import clsx from "clsx";
import { PartyPopperIcon } from "lucide-react";
import moment from "moment";
import { useNumberFormatter } from "react-aria";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";
import { Navigate, useSearchParams } from "react-router-dom";

import { BuildDiffColorStateProvider } from "@/containers/Build/BuildDiffColorState";
import { BuildDiffDetail } from "@/containers/Build/BuildDiffDetail";
import { BuildDiffDetailToolbar } from "@/containers/Build/BuildDiffDetailToolbar";
import {
  DiffCard,
  DiffCardFooter,
  DiffCardFooterText,
  DiffImage,
  ListItemButton,
} from "@/containers/Build/BuildDiffListPrimitives";
import {
  NextButton,
  PreviousButton,
} from "@/containers/Build/toolbar/NavButtons";
import { featureGuardHoc } from "@/containers/FeatureFlag";
import { ProjectPermissionsContext } from "@/containers/Project/PermissionsContext";
import { FlakinessCircleIndicator } from "@/containers/Test/FlakinessCircleIndicator";
import { graphql, type DocumentType } from "@/gql";
import { MetricsPeriod, TestStatus } from "@/gql/graphql";
import {
  EmptyState,
  EmptyStateIcon,
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
import { HeadlessLink } from "@/ui/Link";
import { Separator } from "@/ui/Separator";
import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";
import { useEventCallback } from "@/ui/useEventCallback";
import useViewportSize from "@/ui/useViewportSize";

import { getBuildURL } from "../Build/BuildParams";
import { ChangesChart } from "./ChangesChart";
import {
  PeriodSelect,
  usePeriodState,
  type PeriodsDefinition,
  type PeriodState,
} from "./PeriodSelect";
import { useTestParams, type TestSearchParams } from "./TestParams";

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
          id
          createdAt
          build {
            id
            number
          }
        }
        lastSeenDiff {
          id
          createdAt
          build {
            id
            number
          }
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

const now = new Date();

const PERIODS = {
  [MetricsPeriod.Last_24Hours]: {
    from: moment(now).subtract(24, "hours").toDate(),
    label: "Last 24 hours",
  },
  [MetricsPeriod.Last_3Days]: {
    from: moment(now).subtract(3, "days").toDate(),
    label: "Last 3 days",
  },
  [MetricsPeriod.Last_7Days]: {
    from: moment(now).subtract(7, "days").toDate(),
    label: "Last 7 days",
  },
  [MetricsPeriod.Last_30Days]: {
    from: moment(now).subtract(30, "days").toDate(),
    label: "Last 30 days",
  },
  [MetricsPeriod.Last_90Days]: {
    from: moment(now).subtract(90, "days").toDate(),
    label: "Last 90 days",
  },
} satisfies PeriodsDefinition;

type TestPeriodState = PeriodState<typeof PERIODS>;

/** @route */
export const Component = featureGuardHoc("test-details")(function Component() {
  const compactFormatter = useNumberFormatter({
    notation: "compact",
  });
  const params = useTestParams();
  invariant(params, "Can't be used outside of a test route");
  const periodState = usePeriodState({
    defaultValue: MetricsPeriod.Last_7Days,
    definition: PERIODS,
    paramName: "period" satisfies keyof TestSearchParams,
  });
  const period = periodState.definition[periodState.value];
  const { data } = useSuspenseQuery(TestQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
      testId: params.testId,
      period: periodState.value,
    },
  });

  const project = data.project;
  const test = project?.test;

  if (!test) {
    // @TODO implement a 404 page
    return <Navigate to="/" />;
  }

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
              {(() => {
                switch (test.status) {
                  case TestStatus.Ongoing:
                    return (
                      <Tooltip content="This test is part of the active tests list.">
                        <span>Ongoing</span>
                      </Tooltip>
                    );
                  case TestStatus.Removed:
                    return (
                      <Tooltip content="This test is has been removed from the active tests list.">
                        <span>Removed</span>
                      </Tooltip>
                    );
                  default:
                    assertNever(test.status, "Unknown test status");
                }
              })()}
            </div>
          </PageHeaderContent>
          <div className="flex items-center gap-1">
            <Counter>
              <Tooltip
                content={
                  <>
                    The total number of <strong>auto-approved builds</strong>{" "}
                    this test has been part of.
                  </>
                }
              >
                <CounterLabel>Builds</CounterLabel>
              </Tooltip>
              <CounterValue>
                {compactFormatter.format(test.metrics.all.total)}
              </CounterValue>
            </Counter>
            <Counter>
              <Tooltip
                content={
                  <>The total number of changes detected in this test.</>
                }
              >
                <CounterLabel>Changes</CounterLabel>
              </Tooltip>
              <CounterValue>
                {compactFormatter.format(test.metrics.all.changes)}
              </CounterValue>
            </Counter>
          </div>
        </PageHeader>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <PeriodSelect state={periodState} />
            <div className="bg-app @container flex flex-col gap-2 rounded-md border p-2 pr-6">
              <div className="flex items-center gap-6">
                <div className="flex flex-1 flex-wrap items-center gap-3 gap-y-6 py-2">
                  <Counter>
                    <Tooltip content="Indicates how flaky this test is by analyzing its stability and its consistency.">
                      <CounterLabel>Flakiness</CounterLabel>
                    </Tooltip>
                    <FlakinessCircleIndicator
                      value={test.metrics.all.flakiness}
                      className="size-[4.375rem]"
                    />
                  </Counter>
                  <div className="flex flex-col justify-between self-stretch">
                    <Counter>
                      <Tooltip
                        content={
                          <>
                            The total number of{" "}
                            <strong>auto-approved builds</strong> this test has
                            been part of over the{" "}
                            <strong>
                              {periodState.definition[
                                periodState.value
                              ].label.toLowerCase()}
                            </strong>
                            .
                          </>
                        }
                      >
                        <CounterLabel>Builds</CounterLabel>
                      </Tooltip>
                      <CounterValue>
                        {compactFormatter.format(test.metrics.all.total)}
                      </CounterValue>
                    </Counter>
                    <Counter>
                      <Tooltip
                        content={
                          <>
                            The number of changes detected in this test over the{" "}
                            <strong>
                              {periodState.definition[
                                periodState.value
                              ].label.toLowerCase()}
                            </strong>
                            .
                          </>
                        }
                      >
                        <CounterLabel>Changes</CounterLabel>
                      </Tooltip>
                      <CounterValue>
                        {compactFormatter.format(test.metrics.all.changes)}
                      </CounterValue>
                    </Counter>
                  </div>
                  <div className="flex flex-col justify-between self-stretch">
                    <Counter>
                      <Tooltip
                        content={
                          <>
                            Indicates how stable this test is by comparing the
                            number of changes to the total number of reference
                            builds. A <strong>lower stability rate</strong>{" "}
                            means the test is more likely to be{" "}
                            <strong>flaky</strong>.
                          </>
                        }
                      >
                        <CounterLabel>Stability</CounterLabel>
                      </Tooltip>
                      <CounterValue>
                        {compactFormatter.format(
                          test.metrics.all.stability * 100,
                        )}
                        <CounterValueUnit>%</CounterValueUnit>
                      </CounterValue>
                    </Counter>
                    <Counter>
                      <Tooltip
                        content={
                          <>
                            Indicates how consistent is this test by comparing
                            the number of one-off changes to the total number of
                            changes. A <strong>lower consistency rate</strong>{" "}
                            means the test is more likely to be{" "}
                            <strong>flaky</strong>.
                          </>
                        }
                      >
                        <CounterLabel>Consistency</CounterLabel>
                      </Tooltip>
                      <CounterValue>
                        {compactFormatter.format(
                          test.metrics.all.consistency * 100,
                        )}
                        <CounterValueUnit>%</CounterValueUnit>
                      </CounterValue>
                    </Counter>
                  </div>
                  <ChangesChart
                    className="h-22 max-w- min-w-0 flex-1"
                    series={test.metrics.series}
                    from={period.from}
                  />
                </div>
                <Separator
                  className="h-auto! self-stretch"
                  orientation="vertical"
                />
                {test.firstSeenDiff && test.lastSeenDiff ? (
                  <div className="flex flex-col gap-2">
                    <Seen
                      title="First seen"
                      date={test.firstSeenDiff.createdAt}
                      buildNumber={test.firstSeenDiff.build.number}
                      buildUrl={getBuildURL({
                        ...params,
                        buildNumber: test.firstSeenDiff.build.number,
                        diffId: test.firstSeenDiff.id,
                      })}
                    />
                    <Seen
                      title="Last seen"
                      date={test.lastSeenDiff.createdAt}
                      buildNumber={test.lastSeenDiff.build.number}
                      buildUrl={getBuildURL({
                        ...params,
                        buildNumber: test.lastSeenDiff.build.number,
                        diffId: test.lastSeenDiff.id,
                      })}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
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
});

function Seen(props: {
  title: string;
  date: string;
  buildNumber: number;
  buildUrl: string;
}) {
  const { title, date, buildNumber, buildUrl } = props;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-sm">
        <span className="font-semibold">{title}</span>{" "}
        <Time date={date} className="underline-emphasis" />
      </div>
      <div className="text-low text-xs">
        In build{" "}
        <HeadlessLink className="rac-focus underline" href={buildUrl}>
          #{buildNumber}
        </HeadlessLink>
      </div>
    </div>
  );
}

function Counter(props: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className="text-primary flex select-none flex-col items-center gap-0.5 px-2"
    />
  );
}

function CounterLabel(props: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={clsx(
        "text-low text-xs font-medium",
        "underline-emphasis",
        props.className,
      )}
    />
  );
}

function CounterValue(props: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={clsx("text-lg font-medium leading-5", props.className)}
    />
  );
}

function CounterValueUnit(props: ComponentProps<"span">) {
  return (
    <span
      {...props}
      className={clsx("leading-0 ml-0.5 text-xs", props.className)}
    />
  );
}

type TestDocument = NonNullable<
  NonNullable<DocumentType<typeof TestQuery>["project"]>["test"]
>;

const _ChangesFragment = graphql(`
  fragment TestChangeFragment on TestChange {
    id
    stats(period: $period) {
      totalOccurences
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
      }
      firstSeenDiff {
        id
        createdAt
        build {
          id
          number
        }
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
  periodState: TestPeriodState;
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
    <BuildDiffColorStateProvider>
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
    </BuildDiffColorStateProvider>
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
            <CounterLabel>Occurences</CounterLabel>
          </Tooltip>
          <CounterValue
            className={clsx(
              "tabular-nums",
              change.stats.totalOccurences > 1 ? "text-danger-low" : undefined,
            )}
          >
            {compactFormatter.format(change.stats.totalOccurences)}{" "}
            <small>/ {compactFormatter.format(test.metrics.all.total)}</small>
          </CounterValue>
        </Counter>
        <Separator
          className="h-auto! self-stretch max-lg:hidden"
          orientation="vertical"
        />
        <div className="flex gap-x-6 gap-y-0.5">
          <Seen
            title="First seen"
            date={change.stats.firstSeenDiff.createdAt}
            buildNumber={change.stats.firstSeenDiff.build.number}
            buildUrl={getBuildURL({
              ...params,
              buildNumber: change.stats.firstSeenDiff.build.number,
              diffId: change.stats.firstSeenDiff.id,
            })}
          />
          <Seen
            title="Last seen"
            date={change.stats.lastSeenDiff.createdAt}
            buildNumber={change.stats.lastSeenDiff.build.number}
            buildUrl={getBuildURL({
              ...params,
              buildNumber: change.stats.lastSeenDiff.build.number,
              diffId: change.stats.lastSeenDiff.id,
            })}
          />
        </div>
      </div>
      <BuildDiffDetailToolbar diff={change.stats.lastSeenDiff} />
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
                  {compactFormatter.format(change.stats.totalOccurences)} /{" "}
                  {compactFormatter.format(test.metrics.all.total)}
                </DiffCardFooterText>
              </DiffCardFooter>
            </DiffCard>
          </ListItemButton>
        );
      })}
    </div>
  );
}
