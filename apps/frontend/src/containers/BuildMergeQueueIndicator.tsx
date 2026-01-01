import { SquareStackIcon } from "lucide-react";

import { Tooltip } from "@/ui/Tooltip";

export function BuildMergeQueueIndicator() {
  return (
    <Tooltip content="This build was triggered in a merge queue.">
      <div className="bg-app rounded border p-1.5">
        <SquareStackIcon aria-label="Merge queue" className="text-low size-3" />
      </div>
    </Tooltip>
  );
}
