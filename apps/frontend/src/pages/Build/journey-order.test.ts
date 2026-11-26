import { describe, expect, it } from "vitest";

import { getTestsInReviewOrder, groupTestsForReview } from "./journey-order";

function test(file: string, title: string, changedCount: number) {
  return {
    key: `${file} › ${title}`,
    prefix: file,
    location: { file: `e2e/${file}` },
    changedCount,
  };
}

describe("#groupTestsForReview", () => {
  it("lists the changed tests by file before the unchanged ones", () => {
    const groups = groupTestsForReview([
      test("checkout.spec.ts", "pays by card", 0),
      test("search.spec.ts", "finds a product", 3),
      test("checkout.spec.ts", "completes a purchase", 5),
      test("signup.spec.ts", "creates an account", 0),
    ]);
    expect(
      groups.changed.map((file) => [file.path, file.tests.map((t) => t.key)]),
    ).toEqual([
      ["e2e/checkout.spec.ts", ["checkout.spec.ts › completes a purchase"]],
      ["e2e/search.spec.ts", ["search.spec.ts › finds a product"]],
    ]);
    expect(
      groups.unchanged.map((file) => [file.path, file.tests.map((t) => t.key)]),
    ).toEqual([
      ["e2e/checkout.spec.ts", ["checkout.spec.ts › pays by card"]],
      ["e2e/signup.spec.ts", ["signup.spec.ts › creates an account"]],
    ]);
    // Next from the most changed test is the next changed one, even in
    // another file, before any unchanged test of its own file.
    expect(getTestsInReviewOrder(groups).map((t) => t.key)).toEqual([
      "checkout.spec.ts › completes a purchase",
      "search.spec.ts › finds a product",
      "checkout.spec.ts › pays by card",
      "signup.spec.ts › creates an account",
    ]);
  });
});
