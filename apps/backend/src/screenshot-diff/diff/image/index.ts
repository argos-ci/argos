import { diff } from "@argos-ci/iris";
import { invariant } from "@argos/util/invariant";
import * as Sentry from "@sentry/node";

import logger from "@/logger";
import { tmpName, type Dimensions, type ImageHandle } from "@/storage";

import type { DiffOptions, DiffResult } from "../types";

const DEFAULT_THRESHOLD = 0.5;

/**
 * Most memory one comparison may take. It runs inside the worker, which has
 * 3 GB and runs a screenshot diff and a media diff at once: at this size both
 * fit next to Node's own heap.
 */
const MAX_COMPARISON_BYTES = 1024 ** 3;

/**
 * What a comparison holds: both decoded images, four bytes a pixel, and a
 * quarter of a byte per pixel of the canvas that holds them.
 */
function comparisonBytes(base: Dimensions, head: Dimensions): number {
  const canvas =
    Math.max(base.width, head.width) * Math.max(base.height, head.height);
  return 4 * (base.width * base.height + head.width * head.height) + canvas / 4;
}

/**
 * Compute the difference between two images.
 *
 * Both images are compared on the canvas that holds them, at two
 * sensitivities in one pass: a tolerant one that ignores rendering noise, and
 * a colour-sensitive one that only reports when a faint change covers a large
 * part of the image. Scores are rounded to a hundredth of a percent, as the
 * `odiff` command line printed them, so verdicts and the fingerprints ignore
 * rules are keyed on stay what they were.
 */
export async function diffImages(
  base: ImageHandle,
  head: ImageHandle,
  options: DiffOptions,
): Promise<DiffResult> {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  return Sentry.startSpan(
    {
      name: "diffImages",
      attributes: { "argos.diff.threshold": threshold },
    },
    async (span) => {
      const [baseSize, headSize] = await Promise.all([
        base.getDimensions(),
        head.getDimensions(),
      ]);
      const bytes = comparisonBytes(baseSize, headSize);
      if (bytes > MAX_COMPARISON_BYTES) {
        // Refused from the headers, before a pixel is decoded: an image this
        // large would take the worker down with every job it holds. Reported
        // as a change without a mask, as a text snapshot is.
        logger.warn({ baseSize, headSize, bytes }, "Images too large to diff");
        span.setAttribute("argos.diff.too_large", true);
        return { score: 1 };
      }

      const [basePath, headPath, output] = await Promise.all([
        base.getFilepath(),
        head.getFilepath(),
        tmpName({ postfix: ".png" }),
      ]);
      const result = await diff(basePath, headPath, { threshold, output });
      span.setAttributes({
        "argos.diff.score": result.score,
        "argos.diff.width": result.width,
        "argos.diff.height": result.height,
        "argos.diff.antialiased_pixels": result.antialiasedPixels,
        ...(result.tier !== undefined
          ? { "argos.diff.tier": result.tier }
          : {}),
      });
      if (result.score === 0) {
        return { score: 0 };
      }

      invariant(
        result.mask && result.fingerprint,
        "a difference comes with its mask",
      );
      return {
        score: result.score,
        file: {
          path: output,
          contentType: "image/png",
          width: result.width,
          height: result.height,
          sha256: result.mask.sha256,
          fingerprint: result.fingerprint,
        },
      };
    },
  );
}
