import { memo } from "react";
import { assertNever } from "@argos/util/assertNever";
import clsx from "clsx";
import { GitPullRequestIcon, TowerControlIcon } from "lucide-react";

import { BuildMode } from "@/gql/graphql";
import { Tooltip } from "@/ui/Tooltip";

export function BuildModeDescription(props: { mode: BuildMode }) {
  switch (props.mode) {
    case BuildMode.Ci:
      return (
        <>
          Compared with an approved build found on the base branch by analyzing
          the Git history.
        </>
      );
    case BuildMode.Monitoring:
      return <>Compared with the latest approved build.</>;
    default:
      assertNever(props.mode);
  }
}

export function BuildModeLabel(props: { mode: BuildMode }) {
  switch (props.mode) {
    case BuildMode.Ci:
      return "Continuous Integration";
    case BuildMode.Monitoring:
      return "Monitoring";
    default:
      assertNever(props.mode);
  }
}

function getBuildModeIcon(mode: BuildMode) {
  switch (mode) {
    case BuildMode.Ci:
      return GitPullRequestIcon;
    case BuildMode.Monitoring:
      return TowerControlIcon;
    default:
      assertNever(mode);
  }
}

export const BuildModeIndicator = memo(function BuildModeIndicator(props: {
  mode: BuildMode;
  scale?: "sm" | "md";
}) {
  const scale = props.scale ?? "md";
  const Icon = getBuildModeIcon(props.mode);
  return (
    <Tooltip
      content={
        <>
          <div className="font-medium">
            <BuildModeLabel mode={props.mode} />
          </div>
          <div>
            <BuildModeDescription mode={props.mode} />
          </div>
        </>
      }
    >
      <div
        className={clsx(
          "bg-app self-start rounded-full border",
          { sm: "p-0.5", md: "p-1" }[scale],
        )}
      >
        <Icon
          strokeWidth={1.8}
          className={{ sm: "size-2", md: "size-2.5" }[scale]}
        />
      </div>
    </Tooltip>
  );
});
