import { invariant } from "@argos/util/invariant";
import { useAtom } from "jotai";
import { FileUpIcon, InfoIcon, PanelRightIcon } from "lucide-react";
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

export function TestDetails(props: {
  test: DocumentType<typeof _TestFragment>;
}) {
  const { test } = props;
  const compactFormatter = useNumberFormatter({ notation: "compact" });
  const params = useProjectParams();
  invariant(params, "can't be used outside of a project route");
  return (
    <div className="bg-subtle flex min-h-0 max-w-80 flex-1 flex-col overflow-y-auto border-l-[0.5px]">
      <div className="flex min-h-0 max-w-3xl flex-1 flex-col">
        <div className="mb-2 flex shrink-0 items-baseline justify-between gap-4 px-4 py-3">
          <h2 className="text-low text-sm font-medium">
            Insights
            <Tooltip content="Over the last 7 days">
              <InfoIcon className="-mt-px ml-1 inline-flex size-3" />
            </Tooltip>
          </h2>
          <HeadlessLink
            className="hover:underline-link text-low flex items-center text-xs"
            href={getTestURL({ ...params, testId: test.id })}
          >
            See all
          </HeadlessLink>
        </div>
        <div className="flex">
          <div className="px-4">
            <div className="text-low mb-2 text-xs font-medium">
              Flakiness
              <Tooltip content={<FlakinessTooltip />}>
                <InfoIcon className="-mt-px ml-1 inline-flex size-3" />
              </Tooltip>
            </div>
            <FlakinessCircleIndicator
              value={test.last7daysMetrics.all.flakiness}
              className="size-20"
            />
          </div>
          <div className="flex flex-1 flex-col gap-3 px-4">
            <div className="flex justify-between text-xs">
              <div className="text-low font-medium">
                Builds
                <Tooltip
                  content={<BuildsTooltip periodLabel="over last 7 days" />}
                >
                  <InfoIcon className="-mt-px ml-1 inline-flex size-3" />
                </Tooltip>
              </div>
              <div className="font-semibold">
                {compactFormatter.format(test.last7daysMetrics.all.total)}
              </div>
            </div>
            <div className="flex justify-between text-xs">
              <div className="text-low font-medium">
                Changes
                <Tooltip
                  content={<ChangesTooltip periodLabel="over last 7 days" />}
                >
                  <InfoIcon className="-mt-px ml-1 inline-flex size-3" />
                </Tooltip>
              </div>
              <div className="font-semibold">
                {compactFormatter.format(test.last7daysMetrics.all.changes)}
              </div>
            </div>
            <div className="flex justify-between text-xs">
              <div className="text-low font-medium">
                Stability
                <Tooltip content={<StabilityTooltip />}>
                  <InfoIcon className="-mt-px ml-1 inline-flex size-3" />
                </Tooltip>
              </div>
              <div className="font-semibold">
                {compactFormatter.format(
                  test.last7daysMetrics.all.stability * 100,
                )}
                <small className="text-low ml-0.5">%</small>
              </div>
            </div>
            <div className="flex justify-between text-xs">
              <div className="text-low font-medium">
                Consistency
                <Tooltip content={<ConsistencyTooltip />}>
                  <InfoIcon className="-mt-px ml-1 inline-flex size-3" />
                </Tooltip>
              </div>
              <div className="font-semibold">
                {compactFormatter.format(
                  test.last7daysMetrics.all.consistency * 100,
                )}
                <small className="text-low ml-0.5">%</small>
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-low mt-8 shrink-0 px-4 py-3 text-sm font-medium">
          Activity
        </h2>
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
      </div>
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
