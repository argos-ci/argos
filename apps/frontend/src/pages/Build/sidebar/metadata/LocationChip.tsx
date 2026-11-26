import type { ScreenshotMetadataLocation } from "@/gql/graphql";
import { Chip, ChipLink, type ChipProps } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

import { getRepositoryPath } from "./repository-path";

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

/** Where `file` reads in the repository, when the build knows it. */
export function getRepositoryFileURL(
  props: Pick<LocationChipProps, "repoUrl" | "branch"> & { file: string },
): string | null {
  const { file, repoUrl, branch } = props;
  if (!repoUrl || !branch) {
    return null;
  }
  return `${repoUrl}/blob/${branch}/${getRepositoryPath(file)}`;
}

function getLocationURL(
  props: Pick<LocationChipProps, "location" | "repoUrl" | "branch">,
): string | null {
  const { location, repoUrl, branch } = props;
  if (!location) {
    return null;
  }
  const fileURL = getRepositoryFileURL({
    file: location.file,
    repoUrl,
    branch,
  });
  return fileURL ? `${fileURL}#L${location.line}` : null;
}

export function LocationChip(props: LocationChipProps) {
  const { repoUrl, branch, location, tooltip, ...rest } = props;
  const href = getLocationURL({ location, repoUrl, branch });

  if (href) {
    const link = <ChipLink href={href} target="_blank" {...rest} />;
    return tooltip ? <Tooltip content={tooltip}>{link}</Tooltip> : link;
  }

  return <Chip {...rest} />;
}
