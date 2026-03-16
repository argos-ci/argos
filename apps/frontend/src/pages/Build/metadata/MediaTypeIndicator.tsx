import { LucideProps } from "lucide-react";

import { Tooltip } from "@/ui/Tooltip";

import { getMediaTypeIconKind, mediaTypeIcons } from "./metadataIcons";

export function MediaTypeIndicator({
  mediaType,
  ...props
}: LucideProps & {
  mediaType: string;
}) {
  const kind = getMediaTypeIconKind(mediaType);
  if (!kind) {
    return null;
  }

  const Icon = mediaTypeIcons[kind];

  return (
    <Tooltip content="Print mode (media: print)">
      <Icon {...props} />
    </Tooltip>
  );
}
