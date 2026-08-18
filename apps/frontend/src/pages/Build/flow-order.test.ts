import { describe, expect, it } from "vitest";

import { orderDiffsByFlow, type FlowOrderable } from "./flow-order";

type TestDiff = FlowOrderable & { id: string };

function diff(
  id: string,
  options: {
    test?: string;
    index?: number;
    group?: string;
    variantKey?: string;
  } = {},
): TestDiff {
  return {
    id,
    name: `${id}.png`,
    variantKey: options.variantKey ?? id,
    group: options.group ?? null,
    metadata: options.test
      ? {
          test: { titlePath: ["e2e.spec.ts", options.test] },
          capture:
            options.index === undefined ? null : { index: options.index },
        }
      : null,
  };
}

function order(diffs: TestDiff[]) {
  return orderDiffsByFlow(diffs, (d) => d).map((d) => d.id);
}

describe("#orderDiffsByFlow", () => {
  it("keeps the server order when nothing belongs to a flow", () => {
    expect(order([diff("b"), diff("a"), diff("c")])).toEqual(["b", "a", "c"]);
  });

  it("gathers a journey where its first diff sat, in capture order", () => {
    expect(
      order([
        diff("checkout/payment", { test: "checkout", index: 2 }),
        diff("settings"),
        diff("checkout/cart", { test: "checkout", index: 0 }),
        diff("checkout/shipping", { test: "checkout", index: 1 }),
      ]),
    ).toEqual([
      "checkout/cart",
      "checkout/shipping",
      "checkout/payment",
      "settings",
    ]);
  });

  it("falls back to the step key when no capture order was recorded", () => {
    expect(
      order([
        diff("checkout/shipping", { test: "checkout" }),
        diff("checkout/cart", { test: "checkout" }),
        diff("checkout/payment", { test: "checkout", index: 0 }),
      ]),
    ).toEqual(["checkout/payment", "checkout/cart", "checkout/shipping"]);
  });

  it("keeps the variants of a step together", () => {
    const cartMobile: TestDiff = {
      ...diff("checkout/cart vw-375", { test: "checkout", index: 0 }),
      variantKey: "checkout/cart",
    };
    const cartDesktop: TestDiff = {
      ...diff("checkout/cart vw-1280", { test: "checkout", index: 0 }),
      variantKey: "checkout/cart",
    };
    const paymentMobile: TestDiff = {
      ...diff("checkout/payment vw-375", { test: "checkout", index: 1 }),
      variantKey: "checkout/payment",
    };
    expect(order([paymentMobile, cartMobile, cartDesktop])).toEqual([
      "checkout/cart vw-1280",
      "checkout/cart vw-375",
      "checkout/payment vw-375",
    ]);
  });

  it("orders journeys by their most significant diff, not by name", () => {
    expect(
      order([
        diff("signup/verify", { test: "signup", index: 1 }),
        diff("checkout/cart", { test: "checkout", index: 0 }),
        diff("signup/account", { test: "signup", index: 0 }),
        diff("checkout/payment", { test: "checkout", index: 1 }),
      ]),
    ).toEqual([
      "signup/account",
      "signup/verify",
      "checkout/cart",
      "checkout/payment",
    ]);
  });

  it("moves a similar-change group as one block", () => {
    // The footer changed on the cart and on the settings page: the two
    // diffs are one group. The cart's journey pulls the group with it,
    // rather than leaving the settings page in the middle of the checkout.
    expect(
      order([
        diff("checkout/cart", { test: "checkout", index: 0, group: "footer" }),
        diff("settings", { group: "footer" }),
        diff("checkout/payment", { test: "checkout", index: 1 }),
        diff("checkout/confirmation", { test: "checkout", index: 2 }),
      ]),
    ).toEqual([
      "checkout/cart",
      "settings",
      "checkout/payment",
      "checkout/confirmation",
    ]);
  });

  it("never splits a group between two journeys", () => {
    expect(
      order([
        diff("checkout/cart", { test: "checkout", index: 0, group: "g" }),
        diff("signup/account", { test: "signup", index: 0, group: "g" }),
        diff("checkout/payment", { test: "checkout", index: 1 }),
        diff("signup/verify", { test: "signup", index: 1 }),
      ]),
    ).toEqual([
      "checkout/cart",
      "signup/account",
      "checkout/payment",
      "signup/verify",
    ]);
  });

  it("does not treat a lone group member as a group", () => {
    expect(
      order([
        diff("checkout/payment", { test: "checkout", index: 1, group: "g" }),
        diff("checkout/cart", { test: "checkout", index: 0 }),
      ]),
    ).toEqual(["checkout/cart", "checkout/payment"]);
  });
});
