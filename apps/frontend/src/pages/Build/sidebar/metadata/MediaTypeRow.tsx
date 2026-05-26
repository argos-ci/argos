import { ScreenshotMetadataMediaType } from "@/gql/graphql";
import { Chip } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

import { mediaTypeIcons } from "../../metadata/metadataIcons";
import { MetadataRow } from "./MetadataRow";

export function MediaTypeRow(props: {
  mediaType: ScreenshotMetadataMediaType | null;
}) {
  const { mediaType } = props;
  if (!mediaType || mediaType === ScreenshotMetadataMediaType.Screen) {
    return null;
  }
  return (
    <MetadataRow>
      <Tooltip content="Print mode (media: print)">
        <Chip icon={mediaTypeIcons[mediaType]}>Print</Chip>
      </Tooltip>
    </MetadataRow>
  );
}
