import { invariant } from "@argos/util/invariant";
import clsx from "clsx";
import { useAtom } from "jotai";
import { FileUpIcon, PanelRightIcon } from "lucide-react";
import { useNumberFormatter } from "react-aria";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { FlakinessCircleIndicator } from "@/containers/Test/FlakinessCircleIndicator";
import { graphql, type DocumentType } from "@/gql";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";
import { HeadlessLink } from "@/ui/Link";
import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";
import { TooltipIndicator } from "@/ui/TooltipIndicator";

import { useProjectParams } from "../Project/ProjectParams";
import { getTestURL } from "../Test/TestParams";
import {
  BuildsTooltip,
  ChangesTooltip,
  ConsistencyTooltip,
  FlakinessTooltip,
  StabilityTooltip,
} from "../Test/Widgets";
import { testSidebarAtom } from "./TestSidebar";

const _TestFragment = graphql(`
  fragment TestDetails_Test on Test {
    id
    createdAt
    trails {
      id
      date
      action
      user {
        id
        name
        slug
        avatar {
          ...AccountAvatarFragment
        }
      }
    }
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

const _TestChangeFragment = graphql(`
  fragment TestDetails_TestChange on TestChange {
    id
    ignored
  }
`);

export type TestDetailsProps = {
  change: DocumentType<typeof _TestChangeFragment> | null;
  occurrences: number;
  test: DocumentType<typeof _TestFragment>;
};

export function TestDetails(props: TestDetailsProps) {
  const { test, change, occurrences } = props;
  const compactFormatter = useNumberFormatter({ notation: "compact" });
  const params = useProjectParams();
  invariant(params, "can't be used outside of a project route");
  return (
    <div className="bg-subtle flex min-h-0 max-w-80 flex-1 flex-col overflow-y-auto border-l-[0.5px]">
      <div className="flex min-h-0 max-w-3xl flex-1 flex-col divide-y-[0.5px]">
        {change ? (
          <SidebarSection>
            <SidebarHeader>
              <SidebarHeading>Change</SidebarHeading>
              <HeadlessLink
                className="hover:text-default text-low flex items-center text-xs"
                href={getTestURL(
                  { ...params, testId: test.id },
                  { change: change.id },
                )}
              >
                See details
              </HeadlessLink>
            </SidebarHeader>
            <div className="flex flex-col gap-3 px-4">
              <InsightRow>
                <InsightTitle
                  title="Occurrences"
                  tooltip={
                    <>
                      The number of auto-approved builds that have shown exactly
                      the same change in the last 7 days.
                    </>
                  }
                />
                <InsightValue>
                  {compactFormatter.format(occurrences)} /{" "}
                  {compactFormatter.format(test.last7daysMetrics.all.total)}
                </InsightValue>
              </InsightRow>
              <InsightRow>
                <InsightTitle
                  title="Ignored"
                  tooltip={
                    <>
                      If ignored and the exact same change is detected, you will
                      not be notified about it.
                    </>
                  }
                />
                <InsightValue>{change.ignored ? "Yes" : "No"}</InsightValue>
              </InsightRow>
            </div>
          </SidebarSection>
        ) : null}
        <SidebarSection>
          <SidebarHeader>
            <SidebarHeading>
              Test Insights
              <Tooltip content="Over the last 7 days">
                <TooltipIndicator />
              </Tooltip>
            </SidebarHeading>
            <HeadlessLink
              className="hover:text-default text-low flex items-center text-xs"
              href={getTestURL({ ...params, testId: test.id })}
            >
              See all
            </HeadlessLink>
          </SidebarHeader>
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
                <InsightTitle
                  title="Stability"
                  tooltip={<StabilityTooltip />}
                />
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
        </SidebarSection>
        <SidebarSection>
          <SidebarHeader>
            <SidebarHeading>Test Activity</SidebarHeading>
          </SidebarHeader>
          <div className="px-3 pb-8">
            <div className="relative px-1">
              <div className="absolute top-1 bottom-0 left-[10.5px] w-[0.5px] bg-(--mauve-6)" />
              <ul className="relative space-y-3 text-xs">
                <li className="text-low flex items-center">
                  <div className="bg-subtle mr-2 py-1">
                    <FileUpIcon className="size-3.5" />
                  </div>
                  Test created
                  <span className="w-3 text-center">·</span>
                  <Time date={test.createdAt} />
                </li>
                {test.trails.map((trail) => {
                  return (
                    <li key={trail.id} className="text-low flex items-center">
                      <div className="bg-subtle mr-2 py-1">
                        <AccountAvatar
                          avatar={trail.user.avatar}
                          className="size-3.5 border"
                        />
                      </div>
                      {getActionLabel(trail.action)}
                      <span className="w-3 text-center">·</span>
                      <Time date={trail.date} />
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </SidebarSection>
      </div>
    </div>
  );
}

function SidebarSection(props: { children: React.ReactNode }) {
  return <div className="py-5">{props.children}</div>;
}

function SidebarHeader(props: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "mb-3 flex shrink-0 items-baseline justify-between gap-4 px-4",
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}

function SidebarHeading(props: { children: React.ReactNode }) {
  return <h2 className="text-low text-sm font-medium">{props.children}</h2>;
}

function InsightRow(props: { children: React.ReactNode }) {
  return <div className="flex justify-between text-xs">{props.children}</div>;
}

function InsightValue(props: { children: React.ReactNode }) {
  return <div className="font-semibold">{props.children}</div>;
}

function InsightUnit(props: { children: React.ReactNode }) {
  return <small className="text-low ml-0.5">{props.children}</small>;
}

function InsightTitle(props: {
  title: React.ReactNode;
  tooltip?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("text-low text-xs font-medium", props.className)}>
      {props.title}
      {props.tooltip ? (
        <Tooltip content={props.tooltip}>
          <TooltipIndicator />
        </Tooltip>
      ) : null}
    </div>
  );
}

function getActionLabel(action: string) {
  switch (action) {
    case "files.ignored":
      return "Change ignored";
    case "files.unignored":
      return "Change unignored";
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

export function TestDetailsButton() {
  const [sidebar, setSidebar] = useAtom(testSidebarAtom);
  const isToggled = sidebar === "details";
  const toggle = () => {
    setSidebar((sidebar) => (sidebar === "details" ? null : "details"));
  };
  const hotkey = useBuildHotkey("showDetails", toggle, {
    preventDefault: true,
  });
  return (
    <HotkeyTooltip
      description={isToggled ? "Hide details" : "Show details"}
      keys={hotkey.displayKeys}
    >
      <IconButton aria-pressed={isToggled} onPress={toggle}>
        <PanelRightIcon />
      </IconButton>
    </HotkeyTooltip>
  );
}
