import type { ScreenshotMetadataLocation } from "@/gql/graphql";
import { Chip, ChipLink, type ChipProps } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

export interface LocationChipProps
  extends Pick<ChipProps, "icon" | "scale" | "className" | "children"> {
  location: ScreenshotMetadataLocation | null | undefined;
  repoUrl: string | null | undefined;
  branch: string | null | undefined;
  tooltip: string;
}

export function LocationChip(props: LocationChipProps) {
  const { repoUrl, branch, location, tooltip, ...rest } = props;

  if (location && repoUrl && branch) {
    return (
      <Tooltip content={tooltip}>
        <ChipLink
          href={`${repoUrl}/blob/${branch}/${location.file.replace(/^\/github\/workspace\//, "")}#L${location.line}`}
          target="_blank"
          {...rest}
        />
      </Tooltip>
    );
  }

  return <Chip {...rest} />;
}
