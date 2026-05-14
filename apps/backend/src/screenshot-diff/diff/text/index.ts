import * as Sentry from "@sentry/node";

import type { FileHandle } from "@/storage";
import { hashFileSha256 } from "@/util/hash";

import type { DiffResult } from "../types";

/**
 * Compute the difference between two texts.
 */
export async function diffTexts(
  base: FileHandle,
  head: FileHandle,
): Promise<DiffResult> {
  return Sentry.startSpan(
    {
      name: "diffTexts",
    },
    async () => {
      const [baseHash, headHash] = await Promise.all([
        base.getFilepath().then((path) => hashFileSha256(path)),
        head.getFilepath().then((path) => hashFileSha256(path)),
      ]);
      return { score: baseHash === headHash ? 0 : 1 };
    },
  );
}
