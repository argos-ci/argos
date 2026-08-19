import { describe, expect, it } from "vitest";

import {
  compareSteps,
  getDefaultVariantSelection,
  getJourneyDims,
  getStepLabel,
  getVariantDims,
  getVariantSignature,
  groupJourneys,
  pickVariantByDims,
  resolveFlowIdentity,
  type VariantDims,
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

describe("#groupJourneys", () => {
  const screenshot = (
    variantKey: string,
    test: string | null,
    index: number | null = null,
  ) => ({
    variantKey,
    metadata: test
      ? {
          test: { titlePath: ["e2e.spec.ts", test] },
          capture: index === null ? null : { index },
        }
      : null,
  });

  it("groups screens by journey, in capture order, variants collapsed", () => {
    const journeys = groupJourneys(
      [
        screenshot("checkout/payment", "checkout", 1),
        screenshot("checkout/cart", "checkout", 0),
        screenshot("checkout/cart", "checkout", 0),
        screenshot("settings", null),
        screenshot("signup/verify", "signup"),
        screenshot("signup/account", "signup"),
      ],
      (s) => s,
    );
    expect(
      journeys.map((j) => [j.identity.title, j.steps.map((s) => s.key)]),
    ).toEqual([
      ["checkout", ["checkout/cart", "checkout/payment"]],
      ["signup", ["signup/account", "signup/verify"]],
    ]);
    expect(journeys[0]?.steps[0]?.diffs).toHaveLength(2);
    expect(journeys[0]?.steps[0]?.label).toBe("cart");
  });

  it("drops single-screen tests and screens without metadata", () => {
    expect(
      groupJourneys(
        [screenshot("home", "home"), screenshot("about", null)],
        (s) => s,
      ),
    ).toEqual([]);
  });
});

describe("variant dims", () => {
  const desktopLight: VariantDims = {
    browser: "chromium",
    viewport: 1280,
    scheme: "light",
  };
  const mobileLight: VariantDims = {
    browser: "chromium",
    viewport: 375,
    scheme: "light",
  };
  const desktopDark: VariantDims = {
    browser: "chromium",
    viewport: 1280,
    scheme: "dark",
  };

  it("reads the axes from the metadata", () => {
    expect(
      getVariantDims({
        browser: { name: "firefox" },
        viewport: { width: 414 },
        colorScheme: "dark",
      }),
    ).toEqual({ browser: "firefox", viewport: 414, scheme: "dark" });
    expect(getVariantDims(null)).toEqual({
      browser: null,
      viewport: null,
      scheme: null,
    });
  });

  it("lists what varies and defaults to the largest viewport, light", () => {
    const dims = getJourneyDims([mobileLight, desktopDark, desktopLight]);
    expect(dims).toEqual({
      browsers: ["chromium"],
      viewports: [375, 1280],
      schemes: ["dark", "light"],
    });
    expect(getDefaultVariantSelection(dims)).toEqual(desktopLight);
  });

  it("picks the closest variant and never leaves a hole", () => {
    const variants = [mobileLight, desktopDark];
    expect(pickVariantByDims(variants, (v) => v, desktopLight)).toBe(
      desktopDark,
    );
    expect(pickVariantByDims(variants, (v) => v, mobileLight)).toBe(
      mobileLight,
    );
    expect(pickVariantByDims([], (v) => v, desktopLight)).toBeNull();
  });
});
