import { useEffect, useState } from "react";

import type { Rect } from "./types";

/**
 * Detects colored areas in the image provided by the URL.
 */
export function useColoredRects(input: { url: string }): null | Rect[] {
  const [rects, setRects] = useState<null | Rect[]>(null);
  useEffect(() => {
    const worker = new Worker(new URL("./worker.ts", import.meta.url));
    worker.onmessage = (event) => {
      setRects(event.data);
    };
    worker.postMessage({ url: input.url });
  }, [input.url]);
  return rects;
}
