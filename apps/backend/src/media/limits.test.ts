import { describe, expect, it } from "vitest";

import { resolveExpiresAt, type MediaLimits } from "./limits";

const limits: MediaLimits = {
  maxFileBytes: 50 * 1024 * 1024,
  retentionDays: 30,
  allowedVisibilities: ["public"],
  defaultVisibility: "public",
};

const now = new Date("2026-08-08T12:00:00.000Z");

describe("resolveExpiresAt", () => {
  it("applies the plan's retention", () => {
    expect(resolveExpiresAt({ limits, now })).toEqual(
      new Date("2026-09-07T12:00:00.000Z"),
    );
  });

  it("counts from the upload, so it crosses month boundaries correctly", () => {
    expect(
      resolveExpiresAt({
        limits: { ...limits, retentionDays: 365 },
        now: new Date("2026-12-20T08:30:00.000Z"),
      }),
    ).toEqual(new Date("2027-12-20T08:30:00.000Z"));
  });
});
