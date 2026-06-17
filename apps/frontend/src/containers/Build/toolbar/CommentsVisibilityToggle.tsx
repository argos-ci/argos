import { memo } from "react";
import { MessageSquareIcon, MessageSquareOffIcon } from "lucide-react";

import { IconButton } from "@/ui/IconButton";
import { Tooltip } from "@/ui/Tooltip";

import { useCommentTool } from "../CommentTool";

/** Shows or hides the comments drawn on the changes image. */
export const CommentsVisibilityToggle = memo(() => {
  const { visible, setCommentsVisible } = useCommentTool();
  const label = visible ? "Hide comments" : "Show comments";
  return (
    <Tooltip content={label}>
      <IconButton
        aria-pressed={visible}
        aria-label={label}
        onPress={() => setCommentsVisible(!visible)}
      >
        {visible ? <MessageSquareIcon /> : <MessageSquareOffIcon />}
      </IconButton>
    </Tooltip>
  );
});
