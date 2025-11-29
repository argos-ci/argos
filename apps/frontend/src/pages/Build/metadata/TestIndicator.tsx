import { FlaskConicalIcon } from "lucide-react";

import type { ScreenshotMetadataTest } from "@/gql/graphql";

import { LocationChip, type LocationChipProps } from "./LocationChip";

interface TestIndicatorProps extends Omit<
  LocationChipProps,
  "location" | "children" | "tooltip"
> {
  test: ScreenshotMetadataTest;
}

export function TestIndicator(props: TestIndicatorProps) {
  const { test, ...rest } = props;
  return (
    <LocationChip
      location={test.location}
      icon={FlaskConicalIcon}
      scale="xs"
      tooltip="View test on GitHub"
      {...rest}
    >
      {test.titlePath
        .filter(Boolean)
        .map((x) => x.trim())
        .join(" › ")}
    </LocationChip>
  );
}
