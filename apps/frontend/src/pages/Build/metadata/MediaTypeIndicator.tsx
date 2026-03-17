import { LucideProps } from "lucide-react";

import { ScreenshotMetadataMediaType } from "@/gql/graphql";
import { Tooltip } from "@/ui/Tooltip";

import { mediaTypeIcons } from "./metadataIcons";

export function MediaTypeIndicator({
  mediaType,
  ...props
}: LucideProps & {
  mediaType: ScreenshotMetadataMediaType;
}) {
  if (mediaType === ScreenshotMetadataMediaType.Screen) {
    return null;
  }

  const Icon = mediaTypeIcons[mediaType];

  return (
    <Tooltip content="Print mode (media: print)">
      <Icon {...props} />
    </Tooltip>
  );
}
