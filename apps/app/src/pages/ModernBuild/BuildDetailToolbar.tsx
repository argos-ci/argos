import { IconButton } from "@/modern/ui/IconButton";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  ArrowsPointingInIcon,
} from "@heroicons/react/20/solid";
import { memo } from "react";
import { useBuildDiffFitState } from "./BuildDiffFitState";
import { useBuildDiffState } from "./BuildDiffState";
import { useBuildDiffVisibleState } from "./BuildDiffVisibleState";

const BuildDiffVisibilityToggle = memo(() => {
  const { visible, setVisible } = useBuildDiffVisibleState();
  return (
    <IconButton
      color="danger"
      aria-pressed={visible}
      onClick={() => setVisible((visible) => !visible)}
    >
      <EyeIcon />
    </IconButton>
  );
});

const BuildDiffFitToggle = memo(() => {
  const { contained, setContained } = useBuildDiffFitState();
  return (
    <IconButton
      aria-pressed={contained}
      onClick={() => setContained((contained) => !contained)}
    >
      <ArrowsPointingInIcon />
    </IconButton>
  );
});

const NextBuildButton = memo(() => {
  const { diffs, activeDiff, setActiveDiff } = useBuildDiffState();
  const activeDiffIndex = activeDiff ? diffs.indexOf(activeDiff) : -1;
  return (
    <IconButton
      disabled={activeDiffIndex >= diffs.length - 1}
      onClick={() => {
        const nextDiff = diffs[activeDiffIndex + 1];
        if (nextDiff) {
          setActiveDiff(nextDiff, true);
        }
      }}
    >
      <ArrowDownIcon />
    </IconButton>
  );
});

const PrevBuildButton = memo(() => {
  const { diffs, activeDiff, setActiveDiff } = useBuildDiffState();
  const activeDiffIndex = activeDiff ? diffs.indexOf(activeDiff) : -1;
  return (
    <IconButton
      disabled={activeDiffIndex <= 0}
      onClick={() => {
        const prevDiff = diffs[activeDiffIndex - 1];
        if (prevDiff) {
          setActiveDiff(prevDiff, true);
        }
      }}
    >
      <ArrowUpIcon />
    </IconButton>
  );
});

export interface BuildDetailToolbarProps {
  name: string;
  bordered: boolean;
}

export const BuildDetailToolbar = memo(
  ({ name, bordered }: BuildDetailToolbarProps) => {
    const borderClassName = bordered
      ? "border-b-border"
      : "border-b-transparent";
    return (
      <div
        className={`${borderClassName} b sticky top-0 z-20 flex flex-shrink-0 justify-between gap-4 border-b bg-black/80 p-4 backdrop-blur-[5px] backdrop-saturate-[180%] transition-colors`}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <PrevBuildButton />
            <NextBuildButton />
          </div>
          <div role="heading" className="text-sm font-medium">
            {name}
          </div>
        </div>
        <div className="flex gap-2">
          <BuildDiffFitToggle />
          <BuildDiffVisibilityToggle />
        </div>
      </div>
    );
  }
);
