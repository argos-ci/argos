import type { ScreenshotMetadataLocation } from "@/gql/graphql";
import { Chip, ChipLink, type ChipProps } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

export interface LocationChipProps extends Pick<
  ChipProps,
  "icon" | "scale" | "className" | "children" | "color"
> {
  location: ScreenshotMetadataLocation | null | undefined;
  repoUrl: string | null | undefined;
  branch: string | null | undefined;
  /** Tooltip shown on hover. Omit to render the link without a tooltip. */
  tooltip?: string;
}

export function LocationChip(props: LocationChipProps) {
  const { repoUrl, branch, location, tooltip, ...rest } = props;

  if (location && repoUrl && branch) {
    const link = (
      <ChipLink
        href={`${repoUrl}/blob/${branch}/${location.file.replace(/^\/github\/workspace\//, "")}#L${location.line}`}
        target="_blank"
        {...rest}
      />
    );
    return tooltip ? <Tooltip content={tooltip}>{link}</Tooltip> : link;
  }

  return <Chip {...rest} />;
}
