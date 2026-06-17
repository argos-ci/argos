import { memo } from "react";
import { HandIcon, MessageSquarePlusIcon } from "lucide-react";

import { ButtonGroup } from "@/ui/ButtonGroup";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";
import { Tooltip } from "@/ui/Tooltip";

import { useBuildHotkey } from "../BuildHotkeys";
import { useCommentTool } from "../CommentTool";

/**
 * Switches between the Hand tool (pan/zoom) and the Comment tool (click the
 * changes image to leave a comment). Mirrors `ViewToggle`'s button group.
 */
export const CommentToolToggle = memo(() => {
  const { mode, activateHand, activateComment } = useCommentTool();
  const hotkey = useBuildHotkey(
    "toggleCommentTool",
    () => (mode === "comment" ? activateHand() : activateComment()),
    { preventDefault: true },
  );
  return (
    <ButtonGroup>
      <Tooltip content="Move tool — drag to pan, scroll to zoom">
        <IconButton
          variant="contained"
          aria-pressed={mode === "hand"}
          aria-label="Move tool"
          onPress={activateHand}
        >
          <HandIcon />
        </IconButton>
      </Tooltip>
      <HotkeyTooltip
        description="Comment tool — click the image to comment"
        keys={hotkey.displayKeys}
        keysEnabled={mode !== "comment"}
      >
        <IconButton
          variant="contained"
          aria-pressed={mode === "comment"}
          aria-label="Comment tool"
          onPress={activateComment}
        >
          <MessageSquarePlusIcon />
        </IconButton>
      </HotkeyTooltip>
    </ButtonGroup>
  );
});
