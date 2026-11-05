import { PlayIcon } from "@/ui/argos-icons";
import { Chip } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

import { MetadataRow } from "./MetadataRow";

export function StoryPlayRow(props: { hasPlay: boolean }) {
  if (!props.hasPlay) {
    return null;
  }
  return (
    <MetadataRow>
      <Tooltip content="Story has a play function">
        <Chip color="storybook" icon={PlayIcon}>
          Play
        </Chip>
      </Tooltip>
    </MetadataRow>
  );
}
