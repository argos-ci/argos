import { describe, expect, it } from "vitest";

import { resolveExpiresAt, type MediaLimits } from "./limits";

const limits: MediaLimits = {
  maxFileBytes: 50 * 1024 * 1024,
  defaultRetentionDays: 30,
  maxRetentionDays: 30,
  allowedVisibilities: ["public"],
  defaultVisibility: "public",
};

const now = new Date("2026-08-08T12:00:00.000Z");

describe("resolveExpiresAt", () => {
  it("applies the plan default when the caller asks for nothing", () => {
    expect(
      resolveExpiresAt({ limits, requestedRetentionDays: null, now }),
    ).toEqual(new Date("2026-09-07T12:00:00.000Z"));
  });

  it("honours a shorter retention", () => {
    expect(
      resolveExpiresAt({ limits, requestedRetentionDays: 1, now }),
    ).toEqual(new Date("2026-08-09T12:00:00.000Z"));
  });

  it("clamps a request past the plan maximum instead of rejecting it", () => {
    // Rejecting would fail an upload over a detail the caller does not control;
    // clamping gives them the longest retention their plan allows.
    expect(
      resolveExpiresAt({ limits, requestedRetentionDays: 365, now }),
    ).toEqual(new Date("2026-09-07T12:00:00.000Z"));
  });

  it("counts from the upload, so it crosses month boundaries correctly", () => {
    expect(
      resolveExpiresAt({
        limits: { ...limits, maxRetentionDays: 365 },
        requestedRetentionDays: 365,
        now: new Date("2026-12-20T08:30:00.000Z"),
      }),
    ).toEqual(new Date("2027-12-20T08:30:00.000Z"));
  });
});
