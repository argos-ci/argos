import { RotateCcwIcon } from "lucide-react";

import type { ScreenshotMetadataTest } from "@/gql/graphql";
import { Chip } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

import { MetadataRow } from "./MetadataRow";

export function RetryRow(props: { test: ScreenshotMetadataTest | null }) {
  const retry = props.test?.retry ?? null;
  const retries = props.test?.retries ?? null;
  if (retry === null || retries === null || retries <= 0) {
    return null;
  }
  return (
    <MetadataRow>
      <Tooltip
        content={`Attempt number ${retry + 1} out of a total of ${retries + 1}.`}
      >
        <Chip icon={RotateCcwIcon} className="font-mono tabular-nums">
          Retry {retry + 1} / {retries + 1}
        </Chip>
      </Tooltip>
    </MetadataRow>
  );
}
