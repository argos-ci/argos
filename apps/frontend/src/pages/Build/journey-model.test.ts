import { describe, expect, it } from "vitest";

import {
  compareSteps,
  getCaptureIndex,
  getStepLabel,
  getVariantSignature,
  resolveJourneyIdentity,
} from "./journey-model";

describe("#resolveJourneyIdentity", () => {
  it("groups by test title path", () => {
    expect(
      resolveJourneyIdentity({
        test: { titlePath: ["checkout.spec.ts", "complete a purchase"] },
      }),
    ).toEqual({
      key: "checkout.spec.ts › complete a purchase",
      prefix: "checkout.spec.ts",
      title: "complete a purchase",
    });
  });

  it("groups stories by component", () => {
    expect(
      resolveJourneyIdentity({
        story: { id: "components-button--primary" },
        test: {
          titlePath: ["storybook.spec.ts", "components-button--primary"],
        },
      }),
    ).toEqual({
      key: "storybook › components-button",
      prefix: "storybook",
      title: "components-button",
    });
  });

  it("returns null without test or story metadata", () => {
    expect(resolveJourneyIdentity(null)).toBeNull();
    expect(resolveJourneyIdentity({})).toBeNull();
    expect(resolveJourneyIdentity({ test: { titlePath: [] } })).toBeNull();
    expect(
      resolveJourneyIdentity({ test: { titlePath: ["  ", ""] } }),
    ).toBeNull();
  });
});

describe("#getVariantSignature", () => {
  it("keeps what tells variants apart", () => {
    expect(
      getVariantSignature({
        name: "chromium/checkout/cart vw-375.png",
        variantKey: "checkout/cart",
      }),
    ).toBe("chromium/ vw-375.png");
    expect(
      getVariantSignature({
        name: "chromium/checkout/payment vw-375.png",
        variantKey: "checkout/payment",
      }),
    ).toBe("chromium/ vw-375.png");
    // Same step, two viewports: different signatures.
    expect(
      getVariantSignature({
        name: "chromium/checkout/cart vw-1280.png",
        variantKey: "checkout/cart",
      }),
    ).toBe("chromium/ vw-1280.png");
  });
});

describe("#getStepLabel", () => {
  it("keeps the last path segment", () => {
    expect(getStepLabel("checkout/cart")).toBe("cart");
    expect(getStepLabel("cart")).toBe("cart");
  });
});

describe("#compareSteps", () => {
  it("follows the capture order, then the key", () => {
    const steps = [
      { key: "b", captureIndex: null },
      { key: "z", captureIndex: 0 },
      { key: "a", captureIndex: null },
      { key: "y", captureIndex: 1 },
    ];
    expect(steps.toSorted(compareSteps).map((step) => step.key)).toEqual([
      "z",
      "y",
      "a",
      "b",
    ]);
  });
});

describe("#getCaptureIndex", () => {
  it("reads the index the SDK recorded", () => {
    expect(getCaptureIndex({ capture: { index: 0 } })).toBe(0);
    expect(getCaptureIndex({ capture: { index: 3 } })).toBe(3);
  });

  it("returns null when the SDK is too old to record it", () => {
    expect(getCaptureIndex(null)).toBeNull();
    expect(getCaptureIndex({})).toBeNull();
    expect(getCaptureIndex({ capture: null })).toBeNull();
  });
});
