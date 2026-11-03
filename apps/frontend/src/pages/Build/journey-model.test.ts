import { describe, expect, it } from "vitest";

import {
  compareSteps,
  getCaptureIndex,
  getStepLabel,
  getJourneyRunHints,
  getVariantSignature,
  groupWalkableJourneys,
  resolveJourneyIdentity,
  resolveTestIdentity,
  sortAlongJourneys,
  type JourneyMetadata,
} from "./journey-model";

describe("#resolveTestIdentity", () => {
  it("merges the runs of one test", () => {
    const titlePath = ["checkout.spec.ts", "complete a purchase"];
    const desktop = resolveTestIdentity({
      test: { id: "a1b2-desktop", titlePath },
    });
    expect(desktop).toEqual({
      key: "checkout.spec.ts › complete a purchase",
      prefix: "checkout.spec.ts",
      title: "complete a purchase",
    });
    expect(
      resolveTestIdentity({ test: { id: "c3d4-mobile", titlePath } }),
    ).toEqual(desktop);
  });

  it("groups stories by component", () => {
    expect(
      resolveTestIdentity({
        story: { id: "components-button--primary" },
        test: { id: "a1b2", titlePath: ["storybook.spec.ts", "primary"] },
      }),
    ).toEqual({
      key: "storybook › components-button",
      prefix: "storybook",
      title: "components-button",
    });
  });

  it("returns null without test or story metadata", () => {
    expect(resolveTestIdentity(null)).toBeNull();
    expect(resolveTestIdentity({ test: { titlePath: [" "] } })).toBeNull();
  });
});

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

  it("keeps the runs of one test apart", () => {
    const titlePath = ["checkout.spec.ts", "complete a purchase"];
    const desktop = resolveJourneyIdentity({
      test: { id: "a1b2-desktop", titlePath },
    });
    const mobile = resolveJourneyIdentity({
      test: { id: "c3d4-mobile", titlePath },
    });
    expect(desktop?.key).toBe(
      "checkout.spec.ts › complete a purchase#a1b2-desktop",
    );
    expect(mobile?.key).not.toBe(desktop?.key);
    expect(mobile?.title).toBe("complete a purchase");
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

type Screen = {
  name: string;
  variantKey: string;
  metadata: JourneyMetadata;
};

function screen(
  name: string,
  variantKey: string,
  metadata: JourneyMetadata,
): Screen {
  return { name, variantKey, metadata };
}

const checkout = (index: number) => ({
  test: { id: "checkout", titlePath: ["checkout.spec.ts", "purchase"] },
  capture: { index },
});

describe("#groupWalkableJourneys", () => {
  it("keeps the journeys of several steps, in the order they come in", () => {
    const journeys = groupWalkableJourneys(
      [
        screen("home", "home", {
          test: { titlePath: ["home.spec.ts", "home"] },
        }),
        screen("checkout/payment", "checkout/payment", checkout(1)),
        screen("checkout/cart", "checkout/cart", checkout(0)),
        screen("button--primary", "button--primary", {
          story: { id: "button--primary" },
        }),
        screen("button--secondary", "button--secondary", {
          story: { id: "button--secondary" },
        }),
      ],
      (item) => item.metadata,
    );
    expect(
      journeys.map((journey) => ({
        key: journey.identity.key,
        steps: journey.steps.map((step) => step.key),
      })),
    ).toEqual([
      {
        key: "checkout.spec.ts › purchase#checkout",
        steps: ["checkout/cart", "checkout/payment"],
      },
    ]);
  });
});

describe("#sortAlongJourneys", () => {
  it("walks one variant at a time, step by step", () => {
    const items = [
      screen("checkout/payment dark", "checkout/payment", checkout(1)),
      screen("checkout/cart light", "checkout/cart", checkout(0)),
      screen("checkout/payment light", "checkout/payment", checkout(1)),
      screen("checkout/cart dark", "checkout/cart", checkout(0)),
    ];
    expect(
      sortAlongJourneys(items, (item) => item.metadata).map(
        (item) => item.name,
      ),
    ).toEqual([
      "checkout/cart light",
      "checkout/payment light",
      "checkout/cart dark",
      "checkout/payment dark",
    ]);
  });

  it("walks the journeys in the order they come in", () => {
    const signup = (index: number) => ({
      test: { id: "signup", titlePath: ["signup.spec.ts", "sign up"] },
      capture: { index },
    });
    const items = [
      screen("signup/welcome", "signup/welcome", signup(1)),
      screen("checkout/cart", "checkout/cart", checkout(0)),
      screen("signup/form", "signup/form", signup(0)),
      screen("loose", "loose", null),
      screen("checkout/payment", "checkout/payment", checkout(1)),
    ];
    expect(
      sortAlongJourneys(items, (item) => item.metadata).map(
        (item) => item.name,
      ),
    ).toEqual([
      "signup/form",
      "signup/welcome",
      "checkout/cart",
      "checkout/payment",
      "loose",
    ]);
  });
});

describe("#getJourneyRunHints", () => {
  type Run = Screen & {
    browser: { name: string };
    viewport: { width: number; height: number };
  };
  const run = (
    id: string,
    titlePath: string[],
    browser: string,
    width: number,
  ): Run[] =>
    ["a", "b"].map((step, index) => ({
      name: `${id}/${step}`,
      variantKey: step,
      metadata: { test: { id, titlePath }, capture: { index } },
      browser: { name: browser },
      viewport: { width, height: 720 },
    }));
  const getHints = (items: Run[]) =>
    getJourneyRunHints(
      groupWalkableJourneys(items, (item) => item.metadata),
      (item) => item,
    );

  it("keeps what differs among the runs of one test", () => {
    const hints = getHints([
      ...run("chromium", ["a.spec.ts", "buy"], "chromium", 1280),
      ...run("firefox", ["a.spec.ts", "buy"], "firefox", 1280),
      ...run("mobile", ["a.spec.ts", "buy"], "chromium", 375),
    ]);
    expect(hints.get("a.spec.ts › buy#chromium")).toEqual({
      browser: "chromium",
      viewport: { width: 1280, height: 720 },
    });
    expect(hints.get("a.spec.ts › buy#firefox")).toEqual({
      browser: "firefox",
      viewport: { width: 1280, height: 720 },
    });
  });

  it("gives no hint to a journey alone under its title", () => {
    const hints = getHints([
      ...run("chromium", ["a.spec.ts", "buy"], "chromium", 1280),
      ...run("signup", ["b.spec.ts", "sign up"], "firefox", 375),
    ]);
    expect(hints.get("a.spec.ts › buy#chromium")).toEqual({
      browser: null,
      viewport: null,
    });
  });
});
