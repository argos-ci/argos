import { BugPlayIcon } from "lucide-react";

import { Chip } from "@/ui/Chip";
import { Link } from "@/ui/Link";
import { Tooltip } from "@/ui/Tooltip";

export function TraceIndicator({
  pwTraceUrl,
  ...props
}: {
  pwTraceUrl: string;
  className?: string;
  retry?: number | undefined;
}) {
  return (
    <Tooltip content="View trace in Playwright Trace Viewer">
      <Chip icon={BugPlayIcon} scale="xs" {...props}>
        <Link href={pwTraceUrl} target="_blank">
          Trace
          {props.retry ? ` from retry #${props.retry + 1}` : null}
        </Link>
      </Chip>
    </Tooltip>
  );
}
