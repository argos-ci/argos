import { PlayCircleIcon } from "lucide-react";

import { Chip } from "@/ui/Chip";
import { Link } from "@/ui/Link";
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
        <Link href={traceUrl} target="_blank">
          Playwright Trace
        </Link>
      </Chip>
    </Tooltip>
  );
}
