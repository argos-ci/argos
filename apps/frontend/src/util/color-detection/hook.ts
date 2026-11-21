import { useEffect, useMemo, useState } from "react";

import type { MessageData, MessageInput, Rect } from "./types";
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
  /** Areas of the image to treat as uncolored. */
  exclude?: ReadonlyArray<Rect> | undefined;
}): ColoredRectsState {
  const { url, blockSize, exclude } = input;
  // Compared by value: a refetched diff hands back the same areas in a new
  // array, which must not restart the detection.
  const excludeKey = useMemo(() => JSON.stringify(exclude ?? []), [exclude]);
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
    const areas: Rect[] = JSON.parse(excludeKey);
    worker.postMessage({
      url,
      blockSize,
      exclude: areas,
    } satisfies MessageInput);
    return () => {
      worker.terminate();
    };
  }, [url, blockSize, excludeKey]);
  return state;
}
