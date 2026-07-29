import { useEffect, useState } from "react";

import type { MessageData, Rect } from "./types";

/**
 * State of the colored rects detection.
 * `rects` is `null` when the detection is not possible (unsupported browser
 * or unsupported image format).
 */
export type ColoredRectsState =
  { loading: true; rects: null } | { loading: false; rects: Rect[] | null };

const LOADING_STATE = {
  loading: true,
  rects: null,
} satisfies ColoredRectsState;

/**
 * Detects colored areas in the image provided by the URL.
 */
export function useColoredRects(input: {
  url: string;
  blockSize: number;
}): ColoredRectsState {
  const { url, blockSize } = input;
  const [state, setState] = useState<ColoredRectsState>(LOADING_STATE);
  useEffect(() => {
    setState(LOADING_STATE);

    const worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    worker.addEventListener("message", (event: MessageEvent<MessageData>) => {
      setState({ loading: false, rects: event.data });
    });
    worker.addEventListener("error", (event) => {
      console.error(event.message);
      setState({ loading: false, rects: null });
    });
    worker.postMessage({ url, blockSize });
    return () => {
      worker.terminate();
    };
  }, [url, blockSize]);
  return state;
}
