import { PlayCircleIcon } from "lucide-react";

import { Anchor } from "@/ui/Anchor";
import { Chip } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

export function TraceIndicator({
  traceUrl,
  ...props
}: {
  traceUrl: string;
  className?: string;
}) {
  return (
    <Tooltip content="View trace in Playwright Trace Viewer">
      <Chip icon={PlayCircleIcon} scale="xs" {...props}>
        <Anchor external href={traceUrl}>
          Playwright Trace
        </Anchor>
      </Chip>
    </Tooltip>
  );
}
