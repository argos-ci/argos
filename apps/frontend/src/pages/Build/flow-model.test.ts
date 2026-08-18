import { describe, expect, it } from "vitest";

import {
  compareSteps,
  getStepLabel,
  getVariantSignature,
  resolveFlowIdentity,
} from "./flow-model";

describe("#resolveFlowIdentity", () => {
  it("groups by test title path", () => {
    expect(
      resolveFlowIdentity({
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
      resolveFlowIdentity({
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

  it("merges color-scheme test runs into one journey", () => {
    // Real fixtures from argos-ci.com: the dark run carries a marker on two
    // levels — the "dark mode" suite and the "(dark)" title suffix.
    const light = resolveFlowIdentity({
      test: {
        titlePath: [
          "screenshot-pages.spec.ts",
          "Screenshot pages",
          "Screenshots for about ",
        ],
      },
    });
    const dark = resolveFlowIdentity({
      test: {
        titlePath: [
          "screenshot-pages.spec.ts",
          "Screenshot pages dark mode",
          "Screenshots for about  (dark)",
        ],
      },
    });
    expect(light?.key).toBe(
      "screenshot-pages.spec.ts › Screenshot pages › Screenshots for about",
    );
    expect(dark?.key).toBe(light?.key);
  });

  it("drops describe segments that are nothing but a scheme wrapper", () => {
    expect(
      resolveFlowIdentity({
        test: { titlePath: ["home.spec.ts", "Dark mode", "Homepage"] },
      })?.key,
    ).toBe("home.spec.ts › Homepage");
  });

  it("leaves words that merely contain a scheme token untouched", () => {
    expect(
      resolveFlowIdentity({
        test: { titlePath: ["app.spec.ts", "The darkroom"] },
      })?.key,
    ).toBe("app.spec.ts › The darkroom");
    expect(
      resolveFlowIdentity({
        test: { titlePath: ["app.spec.ts", "Skylight"] },
      })?.key,
    ).toBe("app.spec.ts › Skylight");
  });

  it("returns null without test or story metadata", () => {
    expect(resolveFlowIdentity(null)).toBeNull();
    expect(resolveFlowIdentity({})).toBeNull();
    expect(resolveFlowIdentity({ test: { titlePath: [] } })).toBeNull();
    expect(resolveFlowIdentity({ test: { titlePath: ["dark"] } })).toBeNull();
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
    expect(
      getVariantSignature({ name: "home dark.png", variantKey: "home" }),
    ).toBe(" dark.png");
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
