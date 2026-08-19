import {
  compareSteps,
  getCaptureIndex,
  getVariantSignature,
  resolveFlowIdentity,
  type FlowMetadata,
} from "@/util/flow-model";

/** What the ordering needs to know about a diff. */
export type FlowOrderable = {
  name: string;
  variantKey: string;
  /** Similar-change group the diff belongs to, if any. */
  group: string | null;
  metadata: FlowMetadata;
};

/**
 * Reorders the diffs of one status section so that a journey reads in
 * order: the diffs of a flow become adjacent, in step order, at the place the
 * server gave the first of them — a journey sits where its most significant
 * screenshot sat, and everything else keeps the server order (biggest change
 * first).
 *
 * Similar-change groups stay whole: the list renders a group as one
 * collapsible item and expects its members side by side, so a group is moved
 * as a block to the position of its best-placed member rather than split
 * between journeys.
 *
 * `diffs` must be in server order; the section they come from is what makes
 * groups contiguous to begin with.
 */
export function orderDiffsByFlow<T>(
  diffs: T[],
  describe: (diff: T) => FlowOrderable,
): T[] {
  const entries = diffs.map((diff, index) => {
    const description = describe(diff);
    const flow = resolveFlowIdentity(description.metadata);
    return {
      diff,
      index,
      group: description.group,
      flowKey: flow?.key ?? null,
      step: {
        key: description.variantKey,
        captureIndex: getCaptureIndex(description.metadata),
      },
      signature: getVariantSignature(description),
    };
  });

  // A flow ranks where its first diff was; a diff outside any flow ranks
  // where it was. Ranks never collide across flows since a flow's rank is one
  // of its own members' index.
  const flowRanks = new Map<string, number>();
  for (const entry of entries) {
    if (entry.flowKey !== null && !flowRanks.has(entry.flowKey)) {
      flowRanks.set(entry.flowKey, entry.index);
    }
  }
  const rank = (entry: (typeof entries)[number]) =>
    entry.flowKey === null ? entry.index : (flowRanks.get(entry.flowKey) ?? 0);

  const sorted = entries.toSorted(
    (a, b) =>
      rank(a) - rank(b) ||
      // Same rank means same flow: walk the journey, one variant after
      // another within a step.
      compareSteps(a.step, b.step) ||
      a.signature.localeCompare(b.signature) ||
      a.index - b.index,
  );

  const groupSizes = new Map<string, number>();
  for (const entry of entries) {
    if (entry.group !== null) {
      groupSizes.set(entry.group, (groupSizes.get(entry.group) ?? 0) + 1);
    }
  }
  const blocks: T[][] = [];
  const groupBlocks = new Map<string, T[]>();
  for (const entry of sorted) {
    if (entry.group !== null && (groupSizes.get(entry.group) ?? 0) > 1) {
      let block = groupBlocks.get(entry.group);
      if (!block) {
        block = [];
        groupBlocks.set(entry.group, block);
        blocks.push(block);
      }
      block.push(entry.diff);
    } else {
      blocks.push([entry.diff]);
    }
  }
  return blocks.flat();
}
