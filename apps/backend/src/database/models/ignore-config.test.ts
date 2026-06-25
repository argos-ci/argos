import { describe, expect, it } from "vitest";

import {
  DEFAULT_AUTO_IGNORE_CHANGES,
  normalizeIgnoreConfig,
  resolveIgnoreConfig,
} from "./Project";

describe("resolveIgnoreConfig", () => {
  it("defaults to enabled with default auto-ignore when null", () => {
    expect(resolveIgnoreConfig(null)).toEqual({
      enabled: true,
      autoIgnore: { changes: DEFAULT_AUTO_IGNORE_CHANGES },
    });
  });

  it("defaults to enabled when empty object", () => {
    expect(resolveIgnoreConfig({})).toEqual({
      enabled: true,
      autoIgnore: { changes: DEFAULT_AUTO_IGNORE_CHANGES },
    });
  });

  it("disables everything when the feature is disabled", () => {
    expect(resolveIgnoreConfig({ enabled: false })).toEqual({
      enabled: false,
      autoIgnore: null,
    });
  });

  it("disables auto-ignore but keeps the feature enabled", () => {
    expect(resolveIgnoreConfig({ autoIgnore: false })).toEqual({
      enabled: true,
      autoIgnore: null,
    });
  });

  it("resolves a custom auto-ignore threshold", () => {
    expect(resolveIgnoreConfig({ autoIgnore: { changes: 5 } })).toEqual({
      enabled: true,
      autoIgnore: { changes: 5 },
    });
  });
});

describe("normalizeIgnoreConfig", () => {
  it("returns null when matching the default", () => {
    expect(
      normalizeIgnoreConfig({
        enabled: true,
        autoIgnore: { changes: DEFAULT_AUTO_IGNORE_CHANGES },
      }),
    ).toBeNull();
  });

  it("only stores the disabled flag when the feature is disabled", () => {
    expect(
      normalizeIgnoreConfig({
        enabled: false,
        autoIgnore: { changes: 5 },
      }),
    ).toEqual({ enabled: false });
  });

  it("stores autoIgnore: false when auto-ignore is disabled", () => {
    expect(normalizeIgnoreConfig({ enabled: true, autoIgnore: null })).toEqual({
      autoIgnore: false,
    });
  });

  it("stores a custom auto-ignore threshold", () => {
    expect(
      normalizeIgnoreConfig({ enabled: true, autoIgnore: { changes: 5 } }),
    ).toEqual({ autoIgnore: { changes: 5 } });
  });

  it("round-trips through resolve", () => {
    const cases = [
      { enabled: true, autoIgnore: { changes: DEFAULT_AUTO_IGNORE_CHANGES } },
      { enabled: false, autoIgnore: null },
      { enabled: true, autoIgnore: null },
      { enabled: true, autoIgnore: { changes: 7 } },
    ];
    for (const resolved of cases) {
      expect(resolveIgnoreConfig(normalizeIgnoreConfig(resolved))).toEqual(
        resolved,
      );
    }
  });
});
