import { useEffect, useState } from "react";

import type { MessageData, Rect } from "./types";
// Inlined rather than emitted as its own chunk: a worker's top-level script has
// to be same-origin, whatever CORS allows, and in production the rest of the
// build is served from the asset CDN. `?worker&inline` bundles the worker with
// its imports and constructs it from a blob URL, which is same-origin by
// construction — so this keeps working wherever the assets live.
import ColorDetectionWorker from "./worker?worker&inline";

/**
 * State of the colored rects detection.
 * `rects` is `null` when the detection is not possible (unsupported browser
 * or unsupported image format).
 */
export type ColoredRectsState =
  | { loading: true; rects: null }
  | { loading: false; rects: Rect[] | null };

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

    const worker = new ColorDetectionWorker();
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
