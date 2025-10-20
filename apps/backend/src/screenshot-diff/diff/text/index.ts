import { readFile } from "node:fs/promises";

import type { FileHandle } from "@/storage";

import type { DiffResult } from "../types";
import { getDiffScore } from "./util";

/**
 * Compute the difference between two texts.
 */
export async function diffTexts(
  base: FileHandle,
  head: FileHandle,
): Promise<DiffResult> {
  const [baseText, headText] = await Promise.all([
    base.getFilepath().then((filepath) => readFile(filepath, "utf-8")),
    head.getFilepath().then((filepath) => readFile(filepath, "utf-8")),
  ]);
  const score = getDiffScore(baseText, headText);
  return { score };
}
