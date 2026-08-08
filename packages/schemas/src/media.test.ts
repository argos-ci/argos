import { describe, expect, it } from "vitest";

import { parseMediaStateFromName } from "./media";

describe("parseMediaStateFromName", () => {
  it("lifts the state off the name so a pair shares one", () => {
    // The point of the suffix: both halves come back as `checkout.png`, which is
    // what lets them be matched up and compared.
    expect(parseMediaStateFromName("checkout-before.png")).toEqual({
      name: "checkout.png",
      state: "before",
    });
    expect(parseMediaStateFromName("checkout-after.png")).toEqual({
      name: "checkout.png",
      state: "after",
    });
  });

  it("leaves a name with no suffix alone", () => {
    expect(parseMediaStateFromName("checkout.png")).toEqual({
      name: "checkout.png",
      state: null,
    });
  });

  it("does not guess from a word that merely contains before or after", () => {
    // `-` is the separator; "aftermath" is not a state.
    expect(parseMediaStateFromName("aftermath.png")).toEqual({
      name: "aftermath.png",
      state: null,
    });
    expect(parseMediaStateFromName("before.png")).toEqual({
      name: "before.png",
      state: null,
    });
  });

  it("accepts any case, and normalizes it", () => {
    expect(parseMediaStateFromName("Checkout-AFTER.png")).toEqual({
      name: "Checkout.png",
      state: "after",
    });
  });

  it("handles a name with no extension", () => {
    expect(parseMediaStateFromName("checkout-before")).toEqual({
      name: "checkout",
      state: "before",
    });
  });

  it("keeps the last extension when the name has dots", () => {
    expect(parseMediaStateFromName("checkout.flow-after.mp4")).toEqual({
      name: "checkout.flow.mp4",
      state: "after",
    });
  });

  it("only reads the suffix at the end", () => {
    // A state in the middle is part of the name the caller chose.
    expect(parseMediaStateFromName("before-checkout.png")).toEqual({
      name: "before-checkout.png",
      state: null,
    });
  });
});
