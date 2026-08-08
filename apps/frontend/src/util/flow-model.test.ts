import { describe, expect, it } from "vitest";

import {
  getStepKey,
  getVariantDims,
  getVariantLabel,
  resolveFlowIdentity,
} from "./flow-model";

describe("#resolveFlowIdentity", () => {
  it("groups by test titlePath", () => {
    expect(
      resolveFlowIdentity({
        name: "checkout/cart",
        metadata: {
          test: { titlePath: ["checkout.spec.ts", "complete a purchase"] },
        },
      }),
    ).toEqual({
      key: "checkout.spec.ts › complete a purchase",
      prefix: "checkout.spec.ts",
      title: "complete a purchase",
    });
  });

  it("merges color-scheme test runs into one journey", () => {
    // Real fixtures from argos-ci.com: the dark run carries a marker on two
    // levels — the "dark mode" suite and the "(dark)" title suffix.
    const light = resolveFlowIdentity({
      name: "chromium/about+ vw-1536.png",
      metadata: {
        test: {
          titlePath: [
            "screenshot-pages.spec.ts",
            "Screenshot pages",
            "Screenshots for about ",
          ],
        },
      },
    });
    const dark = resolveFlowIdentity({
      name: "chromium/about+-dark vw-1536.png",
      metadata: {
        test: {
          titlePath: [
            "screenshot-pages.spec.ts",
            "Screenshot pages dark mode",
            "Screenshots for about  (dark)",
          ],
        },
      },
    });
    expect(light?.key).toBe(
      "screenshot-pages.spec.ts › Screenshot pages › Screenshots for about",
    );
    expect(dark?.key).toBe(light?.key);
  });

  it("drops describe segments that are nothing but a scheme wrapper", () => {
    const wrapped = resolveFlowIdentity({
      name: "home.png",
      metadata: {
        test: { titlePath: ["home.spec.ts", "Dark mode", "Homepage"] },
      },
    });
    expect(wrapped?.key).toBe("home.spec.ts › Homepage");
  });

  it("leaves words that merely contain a scheme token untouched", () => {
    expect(
      resolveFlowIdentity({
        name: "darkroom.png",
        metadata: { test: { titlePath: ["app.spec.ts", "The darkroom"] } },
      })?.key,
    ).toBe("app.spec.ts › The darkroom");
    expect(
      resolveFlowIdentity({
        name: "skylight.png",
        metadata: { test: { titlePath: ["app.spec.ts", "Skylight"] } },
      })?.key,
    ).toBe("app.spec.ts › Skylight");
  });

  it("prefers the story component over the runner's test", () => {
    expect(
      resolveFlowIdentity({
        name: "signup-form--default.png",
        metadata: {
          test: { titlePath: ["storybook.test.ts", "signup-form--default"] },
          story: { id: "signup-form--default" },
        },
      }),
    ).toEqual({
      key: "storybook › signup-form",
      prefix: "storybook",
      title: "signup-form",
    });
  });
});

describe("#getStepKey", () => {
  it("collapses viewport and color-scheme variants", () => {
    expect(getStepKey("about+ vw-1536.png")).toBe("about+");
    expect(getStepKey("about+-dark vw-1536.png")).toBe("about+");
    expect(getStepKey("checkout/cart")).toBe("checkout/cart");
  });
});

describe("#getVariantDims", () => {
  it("decomposes a name into its variant axes", () => {
    expect(getVariantDims("chromium/about+-dark vw-1536.png")).toEqual({
      browser: "chromium",
      viewport: 1536,
      scheme: "dark",
      mode: null,
    });
    expect(getVariantDims("signup/create-account vw-414.png")).toEqual({
      browser: null,
      viewport: 414,
      scheme: null,
      mode: null,
    });
    expect(getVariantDims("checkout/cart")).toEqual({
      browser: null,
      viewport: null,
      scheme: null,
      mode: null,
    });
  });
});

describe("#getVariantLabel", () => {
  it("labels viewport and color-scheme variants", () => {
    expect(getVariantLabel("about+ vw-1536.png")).toBe("1536px");
    expect(getVariantLabel("about+-dark vw-1536.png")).toBe("1536px · dark");
    expect(getVariantLabel("checkout/cart")).toBe("default");
  });
});
