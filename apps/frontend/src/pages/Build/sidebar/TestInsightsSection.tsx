import { invariant } from "@argos/util/invariant";
import clsx from "clsx";
import { useNumberFormatter } from "react-aria";

import { FlakinessCircleIndicator } from "@/containers/Test/FlakinessCircleIndicator";
import { graphql, type DocumentType } from "@/gql";
import { HeadlessLink } from "@/ui/Link";
import { Panel, PanelHeader, PanelTitle } from "@/ui/Panel";
import { Tooltip } from "@/ui/Tooltip";
import { TooltipIndicator } from "@/ui/TooltipIndicator";

import { useProjectParams } from "../../Project/ProjectParams";
import { getTestURL } from "../../Test/TestParams";
import {
  BuildsTooltip,
  ChangesTooltip,
  ConsistencyTooltip,
  FlakinessTooltip,
  StabilityTooltip,
} from "../../Test/Widgets";
import { InsightTitle } from "./InsightTitle";

const _TestFragment = graphql(`
  fragment TestInsightsSection_Test on Test {
    id
    last7daysMetrics: metrics(period: LAST_7_DAYS) {
      all {
        total
        flakiness
        stability
        changes
        consistency
      }
    }
  }
`);

export function TestInsightsSection(props: {
  test: DocumentType<typeof _TestFragment>;
}) {
  const { test } = props;
  const compactFormatter = useNumberFormatter({ notation: "compact" });
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
              {compactFormatter.format(test.last7daysMetrics.all.total)}
            </InsightValue>
          </InsightRow>
          <InsightRow>
            <InsightTitle
              title="Changes"
              tooltip={<ChangesTooltip periodLabel="over last 7 days" />}
            />
            <InsightValue>
              {compactFormatter.format(test.last7daysMetrics.all.changes)}
            </InsightValue>
          </InsightRow>
          <InsightRow>
            <InsightTitle title="Stability" tooltip={<StabilityTooltip />} />
            <InsightValue>
              {compactFormatter.format(
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
              {compactFormatter.format(
                test.last7daysMetrics.all.consistency * 100,
              )}
              <InsightUnit>%</InsightUnit>
            </InsightValue>
          </InsightRow>
        </div>
      </div>
    </Panel>
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
