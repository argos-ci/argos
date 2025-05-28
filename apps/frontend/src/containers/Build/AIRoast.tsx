import { useCompletion } from "@ai-sdk/react";

import { config } from "@/config";
import { Button } from "@/ui/Button";

import { MemoizedMarkdown } from "./MemoizedMarkdown";

export function AIRoast(props: { diffId: string }) {
  const { completion, isLoading, complete } = useCompletion({
    api: new URL(`/diffs/${props.diffId}/roast`, config.api.baseUrl).toString(),
  });

  return (
    <div className="flex flex-col gap-4 p-4">
      <Button
        onPress={() => {
          complete("");
        }}
        className="self-start"
        isDisabled={isLoading}
      >
        Roast
      </Button>
      <div className="bg-app prose prose-sm min-h-0 flex-1 overflow-auto rounded border p-4">
        <MemoizedMarkdown id="x" content={completion} />
      </div>
    </div>
  );
}
