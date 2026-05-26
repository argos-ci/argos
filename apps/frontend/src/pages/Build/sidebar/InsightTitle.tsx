import clsx from "clsx";

import { Tooltip } from "@/ui/Tooltip";
import { TooltipIndicator } from "@/ui/TooltipIndicator";

export function InsightTitle(props: {
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
