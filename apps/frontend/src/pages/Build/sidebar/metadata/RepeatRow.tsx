import { RepeatIcon } from "lucide-react";

import type { ScreenshotMetadataTest } from "@/gql/graphql";
import { Chip } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

import { MetadataRow } from "./MetadataRow";
import type { AutomationLibrary } from "./utils";

export function RepeatRow(props: {
  test: ScreenshotMetadataTest | null;
  automationLibrary: AutomationLibrary | null;
}) {
  const { automationLibrary } = props;
  const repeat = props.test?.repeat ?? null;
  if (repeat === null || repeat <= 0) {
    return null;
  }
  const isPlaywright = automationLibrary?.name === "@playwright/test";
  return (
    <MetadataRow>
      <Tooltip
        content={
          isPlaywright ? (
            <>
              Repeat number {repeat} (Enabled by passing{" "}
              <code>--repeat-each</code> to Playwright CLI).
            </>
          ) : (
            `Repeat number ${repeat}`
          )
        }
      >
        <Chip icon={RepeatIcon} className="font-mono tabular-nums">
          Repeat {repeat}
        </Chip>
      </Tooltip>
    </MetadataRow>
  );
}
