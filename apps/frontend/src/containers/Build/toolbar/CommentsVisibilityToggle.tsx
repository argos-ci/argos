import { memo } from "react";
import { MessageSquareIcon, MessageSquareOffIcon } from "lucide-react";

import { Button } from "@/ui/Button";
import { Tooltip } from "@/ui/Tooltip";

import { useCommentTool } from "../CommentTool";

/** Shows or hides the comments drawn on the changes image. */
export const CommentsVisibilityToggle = memo(() => {
  const { visible, setCommentsVisible } = useCommentTool();
  const label = visible ? "Hide comments" : "Show comments";
  return (
    <Tooltip content={label}>
      {/* No pressed state: the icon already carries it. */}
      <Button
        variant="secondary"
        iconOnly
        aria-label={label}
        onPress={() => setCommentsVisible(!visible)}
      >
        {visible ? <MessageSquareIcon /> : <MessageSquareOffIcon />}
      </Button>
    </Tooltip>
  );
});
