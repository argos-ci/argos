import { ScreenshotMetadataMediaType } from "@/gql/graphql";
import { Chip } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

import { mediaTypeIcons } from "../metadataIcons";

export function MediaTypeChip(props: {
  mediaType: ScreenshotMetadataMediaType | null;
}) {
  const { mediaType } = props;
  if (!mediaType || mediaType === ScreenshotMetadataMediaType.Screen) {
    return null;
  }
  return (
    <Tooltip content="Print mode (media: print)">
      <Chip icon={mediaTypeIcons[mediaType]}>Print</Chip>
    </Tooltip>
  );
}
