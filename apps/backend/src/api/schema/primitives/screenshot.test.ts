import { describe, expect, it } from "vitest";

import { ScreenshotInputSchema } from "./screenshot";

const base = { key: "a".repeat(64), name: "home.png" };

describe("ScreenshotInputSchema", () => {
  it("defaults contentType to image/png", () => {
    expect(ScreenshotInputSchema.parse(base).contentType).toBe("image/png");
  });

  it("accepts supported image and text content types", () => {
    const supported = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "text/plain",
      "application/json",
      "application/yaml",
      "text/yaml",
      "application/xml",
      "text/xml",
      "text/html",
      "text/markdown",
    ];
    for (const contentType of supported) {
      expect(
        ScreenshotInputSchema.parse({ ...base, contentType }).contentType,
      ).toBe(contentType);
    }
  });

  it("normalizes the content type (lowercase and strips parameters)", () => {
    expect(
      ScreenshotInputSchema.parse({
        ...base,
        contentType: "TEXT/HTML; charset=utf-8",
      }).contentType,
    ).toBe("text/html");
  });

  it("rejects unsupported and unsafe content types", () => {
    const rejected = [
      "image/svg+xml",
      "application/x-msdownload",
      "text/x-evil",
      "video/mp4",
      "",
    ];
    for (const contentType of rejected) {
      expect(() =>
        ScreenshotInputSchema.parse({ ...base, contentType }),
      ).toThrow();
    }
  });
});
