import { useAtom } from "jotai";
import { PanelRightIcon } from "lucide-react";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { graphql, type DocumentType } from "@/gql";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";

import { rightSidebarAtom } from "./RightSidebar";
import { TestActivitySection } from "./sidebar/TestActivitySection";
import { TestChangeSection } from "./sidebar/TestChangeSection";
import { TestInsightsSection } from "./sidebar/TestInsightsSection";

const _TestFragment = graphql(`
  fragment TestDetails_Test on Test {
    ...TestChangeSection_Test
    ...TestInsightsSection_Test
    ...TestActivitySection_Test
  }
`);

const _TestChangeFragment = graphql(`
  fragment TestDetails_TestChange on TestChange {
    ...TestChangeSection_TestChange
    ...TestActivitySection_TestChange
  }
`);

export type TestDetailsProps = {
  change: DocumentType<typeof _TestChangeFragment> | null;
  occurrences: number;
  test: DocumentType<typeof _TestFragment>;
};

export function TestDetails(props: TestDetailsProps) {
  const { test, change, occurrences } = props;
  return (
    <>
      {change ? (
        <TestChangeSection
          test={test}
          change={change}
          occurrences={occurrences}
        />
      ) : null}
      <TestInsightsSection test={test} />
      <TestActivitySection test={test} change={change} />
    </>
  );
}

export function TestDetailsButton() {
  const [sidebar, setSidebar] = useAtom(rightSidebarAtom);
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
