import { invariant } from "@argos/util/invariant";
import clsx from "clsx";

import { config } from "@/config";
import { AiPromptButton } from "@/containers/AiPromptButton";
import { createFixFlakinessPrompt } from "@/containers/Test/FixFlakinessPrompt";
import { isFlaky } from "@/containers/Test/Flakiness";
import { FlakinessCircleIndicator } from "@/containers/Test/FlakinessCircleIndicator";
import { graphql, type DocumentType } from "@/gql";
import { MetricsPeriod } from "@/gql/graphql";
import { HeadlessLink } from "@/ui/Link";
import { Panel, PanelHeader, PanelTitle } from "@/ui/Panel";
import { Tooltip } from "@/ui/Tooltip";
import { TooltipIndicator } from "@/ui/TooltipIndicator";
import { compactNumberFormatter } from "@/util/intl";

import { useProjectParams } from "../../Project/ProjectParams";
import { getTestURL } from "../../Test/TestParams";
import {
  BuildsTooltip,
  ChangesTooltip,
  ConsistencyTooltip,
  FlakinessTooltip,
  StabilityTooltip,
} from "../../Test/Widgets";
import type { Diff } from "../BuildDiffState";
import { InsightTitle } from "./InsightTitle";

const _TestFragment = graphql(`
  fragment TestInsightsSection_Test on Test {
    id
    name
    buildName
    last7daysMetrics: metrics(period: LAST_7_DAYS) {
      all {
        total
        flakiness
        stability
        changes
        uniqueChanges
        consistency
      }
    }
  }
`);

export function TestInsightsSection(props: {
  test: DocumentType<typeof _TestFragment>;
  diff: Diff;
}) {
  const { test, diff } = props;
  const params = useProjectParams();
  invariant(params, "can't be used outside of a project route");
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>
          Test Insights
          <Tooltip content="Over the last 7 days">
            <TooltipIndicator />
          </Tooltip>
        </PanelTitle>
        <HeadlessLink
          className="hover:text-default text-low flex items-center text-xs"
          href={getTestURL({ ...params, testId: test.id })}
        >
          See all
        </HeadlessLink>
      </PanelHeader>
      <div className="flex">
        <div className="px-4">
          <InsightTitle
            className="mb-2"
            title="Flakiness"
            tooltip={<FlakinessTooltip />}
          />
          <FlakinessCircleIndicator
            value={test.last7daysMetrics.all.flakiness}
            className="size-20"
          />
        </div>
        <div className="flex flex-1 flex-col gap-3 px-4">
          <InsightRow>
            <InsightTitle
              title="Builds"
              tooltip={<BuildsTooltip periodLabel="over last 7 days" />}
            />
            <InsightValue>
              {compactNumberFormatter.format(test.last7daysMetrics.all.total)}
            </InsightValue>
          </InsightRow>
          <InsightRow>
            <InsightTitle
              title="Changes"
              tooltip={<ChangesTooltip periodLabel="over last 7 days" />}
            />
            <InsightValue>
              {compactNumberFormatter.format(test.last7daysMetrics.all.changes)}
            </InsightValue>
          </InsightRow>
          <InsightRow>
            <InsightTitle title="Stability" tooltip={<StabilityTooltip />} />
            <InsightValue>
              {compactNumberFormatter.format(
                test.last7daysMetrics.all.stability * 100,
              )}
              <InsightUnit>%</InsightUnit>
            </InsightValue>
          </InsightRow>
          <InsightRow>
            <InsightTitle
              title="Consistency"
              tooltip={<ConsistencyTooltip />}
            />
            <InsightValue>
              {compactNumberFormatter.format(
                test.last7daysMetrics.all.consistency * 100,
              )}
              <InsightUnit>%</InsightUnit>
            </InsightValue>
          </InsightRow>
        </div>
      </div>
      <FixFlakinessAction diff={diff} />
    </Panel>
  );
}

/**
 * Whether Argos already considers the snapshot in front of the reviewer flaky:
 * the same change coming back build after build, or a test whose flakiness
 * score the gauge does not paint green. Either way the capture is noise, and
 * what has to change is the test rather than the baseline.
 */
function checkIsFlakySnapshot(
  diff: Diff,
): diff is Diff & { test: NonNullable<Diff["test"]> } {
  if (!diff.test) {
    return false;
  }
  return (
    diff.last7daysOccurrences > 1 ||
    isFlaky(diff.test.last7daysMetrics.all.flakiness)
  );
}

/**
 * The way out of the numbers above, at the point where they say the capture is
 * unstable. Only on a snapshot Argos calls flaky: on a stable one there is
 * nothing to fix, and the panel is there to say so.
 *
 * It hands out the test's prompt, not one about this capture: a flake is what
 * the test does over time, and no single screenshot of it is the right one.
 */
function FixFlakinessAction(props: { diff: Diff }) {
  const { diff } = props;
  const params = useProjectParams();
  invariant(params, "can't be used outside of a project route");
  if (!checkIsFlakySnapshot(diff)) {
    return null;
  }
  const { test } = diff;
  const prompt = createFixFlakinessPrompt({
    test: { ...test, metrics: test.last7daysMetrics.all },
    accountSlug: params.accountSlug,
    projectName: params.projectName,
    period: MetricsPeriod.Last_7Days,
    periodLabel: "last 7 days",
    testUrl: new URL(
      getTestURL({ ...params, testId: test.id }),
      config.server.url,
    ).href,
  });
  return (
    <div className="mt-4 flex px-4">
      <AiPromptButton
        size="small"
        prompts={[
          {
            label: "Fix this flaky snapshot",
            name: "flaky snapshot prompt",
            prompt,
          },
        ]}
      />
    </div>
  );
}

function InsightRow(props: { children: React.ReactNode }) {
  return <div className="flex justify-between text-xs">{props.children}</div>;
}

function InsightValue(props: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("text-default font-semibold", props.className)}>
      {props.children}
    </div>
  );
}

function InsightUnit(props: { children: React.ReactNode }) {
  return <small className="text-low ml-0.5">{props.children}</small>;
}
