import { describe, expect, it } from "vitest";

import type { Journey, VariantDims } from "@/util/flow-model";

import {
  buildStoryboard,
  countChanges,
  type StoryboardDiff,
} from "./storyboard";

type Diff = StoryboardDiff & { id: string };

const desktop: VariantDims = {
  browser: "chromium",
  viewport: 1280,
  scheme: "light",
};
const mobile: VariantDims = {
  browser: "chromium",
  viewport: 375,
  scheme: "light",
};

function diff(
  id: string,
  kind: "unchanged" | "changed" | "added" | "removed",
  dims: VariantDims = desktop,
): Diff {
  return {
    id,
    hasCompare: kind !== "removed",
    hasBase: kind !== "added",
    unchanged: kind === "unchanged",
    dims,
  };
}

const journey: Journey<Diff> = {
  identity: { key: "checkout", prefix: "", title: "checkout" },
  steps: [
    {
      key: "cart",
      label: "cart",
      captureIndex: 0,
      diffs: [diff("cart", "unchanged"), diff("cart-m", "unchanged", mobile)],
    },
    {
      key: "options",
      label: "options",
      captureIndex: 1,
      diffs: [diff("options", "added")],
    },
    {
      key: "payment",
      label: "payment",
      captureIndex: 2,
      diffs: [diff("payment-m", "changed", mobile), diff("payment", "changed")],
    },
    {
      key: "legacy",
      label: "legacy",
      captureIndex: 3,
      diffs: [diff("legacy", "removed")],
    },
  ],
};

describe("#buildStoryboard", () => {
  it("tells what happened to each step, on the selected variant", () => {
    const rows = buildStoryboard(journey, (d) => d, desktop, {
      onlyChanges: false,
    });
    expect(rows.map((r) => [r.position, r.key, r.diff.id, r.kind])).toEqual([
      [1, "cart", "cart", "unchanged"],
      [2, "options", "options", "added"],
      [3, "payment", "payment", "changed"],
      [4, "legacy", "legacy", "removed"],
    ]);
    expect(rows.every((r) => !r.collapsed)).toBe(true);
    expect(countChanges(rows)).toBe(3);
  });

  it("follows the variant selection, falling back to the closest one", () => {
    const rows = buildStoryboard(journey, (d) => d, mobile, {
      onlyChanges: false,
    });
    expect(rows.map((r) => r.diff.id)).toEqual([
      "cart-m",
      "options",
      "payment-m",
      "legacy",
    ]);
  });

  it("folds the unchanged steps when only changes are wanted", () => {
    const rows = buildStoryboard(journey, (d) => d, desktop, {
      onlyChanges: true,
    });
    expect(rows.map((r) => [r.key, r.collapsed])).toEqual([
      ["cart", true],
      ["options", false],
      ["payment", false],
      ["legacy", false],
    ]);
  });
});
