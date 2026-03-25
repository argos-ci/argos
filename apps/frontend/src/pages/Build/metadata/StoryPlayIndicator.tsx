import { PlayIcon } from "lucide-react";

import { Chip } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

export function StoryPlayIndicator() {
  return (
    <Tooltip content="Story has a play function">
      <Chip color="storybook" icon={PlayIcon} scale="xs" />
    </Tooltip>
  );
}
