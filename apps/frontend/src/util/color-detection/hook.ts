import { useEffect, useState } from "react";

import type { MessageData, Rect } from "./types";

/**
 * Detects colored areas in the image provided by the URL.
 */
export function useColoredRects(input: { url: string }): null | Rect[] {
  const [rects, setRects] = useState<null | Rect[]>(null);
  useEffect(() => {
    setRects(null);

    const worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    worker.addEventListener("message", (event: MessageEvent<MessageData>) => {
      setRects(event.data);
    });
    worker.addEventListener("error", (event) => {
      console.error(event.message);
    });
    worker.postMessage({ url: input.url });
    return () => {
      worker.terminate();
    };
  }, [input.url]);
  return rects;
}
