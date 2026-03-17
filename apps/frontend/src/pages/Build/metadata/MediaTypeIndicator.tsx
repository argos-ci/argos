import { LucideProps } from "lucide-react";

import { Tooltip } from "@/ui/Tooltip";

import { isMediaType, mediaTypeIcons } from "./metadataIcons";

export function MediaTypeIndicator({
  mediaType,
  ...props
}: LucideProps & {
  mediaType: string;
}) {
  if (!isMediaType(mediaType)) {
    return null;
  }

  const Icon = mediaTypeIcons[mediaType];

  return (
    <Tooltip content="Print mode (media: print)">
      <Icon {...props} />
    </Tooltip>
  );
}
