import { invariant } from "@argos/util/invariant";

import { ScreenshotDiffStatus } from "@/gql/graphql";
import { useProjectParams } from "@/pages/Project/ProjectParams";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { Separator } from "@/ui/Separator";

import type { BuildDiffDetailDocument } from "./BuildDiffDetail";
import { FitToggle } from "./toolbar/FitToggle";
import { HighlightButton } from "./toolbar/HighlightButton";
import {
  GoToNextChangesButton,
  GoToPreviousChangesButton,
} from "./toolbar/NavChangesButton";
import { OverlayToggle } from "./toolbar/OverlayToggle";
import { SettingsButton } from "./toolbar/SettingsButton";
import { SplitViewToggle, ViewToggle } from "./toolbar/ViewToggle";

interface BuildDiffDetailToolbarProps {
  diff: BuildDiffDetailDocument;
  children?: React.ReactNode;
}

export function BuildDiffDetailToolbar(props: BuildDiffDetailToolbarProps) {
  const { diff, children } = props;
  const isChanged = diff.status === ScreenshotDiffStatus.Changed;

  const params = useProjectParams();
  invariant(params, "can't be used outside of a project route");

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <ViewToggle />
      <SplitViewToggle />
      <FitToggle />
      {isChanged && (
        <>
          <Separator orientation="vertical" className="mx-1 h-6" />
          <OverlayToggle />
          <ButtonGroup>
            <GoToPreviousChangesButton />
            <HighlightButton />
            <GoToNextChangesButton />
          </ButtonGroup>
          <SettingsButton />
        </>
      )}
      <div className="group contents">
        <Separator
          orientation="vertical"
          className="mx-1 h-6 group-empty:hidden"
        />
        {children}
      </div>
    </div>
  );
}
