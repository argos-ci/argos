import { BugPlayIcon } from "lucide-react";

import { Chip } from "@/ui/Chip";
import { Link } from "@/ui/Link";
import { Tooltip } from "@/ui/Tooltip";

import type { Diff } from "../../BuildDiffState";
import { MetadataRow } from "./MetadataRow";
import { resolveDiffMetadata } from "./utils";

export function TraceRow(props: { diff: Diff; siblingDiffs: Diff[] }) {
  const { diff, siblingDiffs } = props;
  const pwTraceUrl = diff.compareScreenshot?.playwrightTraceUrl ?? null;
  if (pwTraceUrl) {
    return <TraceChip pwTraceUrl={pwTraceUrl} />;
  }
  const sibling = siblingDiffs.find(
    (d) => d.compareScreenshot?.playwrightTraceUrl,
  );
  const siblingPwTraceUrl = sibling?.compareScreenshot?.playwrightTraceUrl;
  if (!siblingPwTraceUrl) {
    return null;
  }
  const retry = resolveDiffMetadata(sibling)?.test?.retry ?? undefined;
  return <TraceChip pwTraceUrl={siblingPwTraceUrl} retry={retry} />;
}

function TraceChip(props: { pwTraceUrl: string; retry?: number }) {
  return (
    <MetadataRow>
      <Tooltip content="View trace in Playwright Trace Viewer">
        <Chip icon={BugPlayIcon}>
          <Link href={props.pwTraceUrl} target="_blank">
            Trace
            {props.retry ? ` from retry #${props.retry + 1}` : null}
          </Link>
        </Chip>
      </Tooltip>
    </MetadataRow>
  );
}
