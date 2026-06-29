import { describe, expect, it } from "vitest";

import type { Build } from "@/database/models";

import { getBuildBaselineEligibility } from "./baselineEligibility";

type EligibilityArgs = Parameters<typeof getBuildBaselineEligibility>[0];

function getEligibility(overrides: {
  build?: Partial<Pick<Build, "jobStatus" | "subset" | "type">>;
  valid?: boolean;
  rejected?: boolean;
  hasAcceptedReview?: boolean;
  hasMergedPullRequest?: boolean;
}) {
  const args: EligibilityArgs = {
    build: {
      jobStatus: "complete",
      subset: false,
      type: "reference",
      ...overrides.build,
    },
    valid: overrides.valid ?? true,
    rejected: overrides.rejected ?? false,
    hasAcceptedReview: overrides.hasAcceptedReview ?? false,
    hasMergedPullRequest: overrides.hasMergedPullRequest ?? false,
  };
  return getBuildBaselineEligibility(args);
}

describe("getBuildBaselineEligibility", () => {
  it("is eligible for an auto-approved (reference) build", () => {
    expect(getEligibility({ build: { type: "reference" } })).toEqual({
      eligible: true,
      reasons: [],
    });
  });

  it("is eligible for an orphan build", () => {
    expect(getEligibility({ build: { type: "orphan" } })).toEqual({
      eligible: true,
      reasons: [],
    });
  });

  it("is eligible for a check build with an accepted review", () => {
    expect(
      getEligibility({ build: { type: "check" }, hasAcceptedReview: true }),
    ).toEqual({ eligible: true, reasons: [] });
  });

  it("is eligible for a check build with a merged pull request", () => {
    expect(
      getEligibility({ build: { type: "check" }, hasMergedPullRequest: true }),
    ).toEqual({ eligible: true, reasons: [] });
  });

  it("is not eligible for an unapproved check build", () => {
    expect(getEligibility({ build: { type: "check" } })).toEqual({
      eligible: false,
      reasons: ["not-approved"],
    });
  });

  it("is not eligible for a rejected check build", () => {
    expect(
      getEligibility({ build: { type: "check" }, rejected: true }),
    ).toEqual({ eligible: false, reasons: ["rejected"] });
  });

  it("is not eligible for a rejected reference build", () => {
    expect(
      getEligibility({ build: { type: "reference" }, rejected: true }),
    ).toEqual({ eligible: false, reasons: ["rejected"] });
  });

  it("is not eligible for a rejected orphan build", () => {
    expect(
      getEligibility({ build: { type: "orphan" }, rejected: true }),
    ).toEqual({ eligible: false, reasons: ["rejected"] });
  });

  it("reports rejection instead of approval when both could apply", () => {
    expect(
      getEligibility({
        build: { type: "check" },
        rejected: true,
        hasAcceptedReview: true,
      }),
    ).toEqual({ eligible: false, reasons: ["rejected"] });
  });

  it("is not eligible for a skipped build", () => {
    expect(getEligibility({ build: { type: "skipped" } })).toEqual({
      eligible: false,
      reasons: ["not-approved"],
    });
  });

  it("is not eligible when framework tests did not pass", () => {
    expect(getEligibility({ valid: false })).toEqual({
      eligible: false,
      reasons: ["tests-failed"],
    });
  });

  it("is not eligible when the build is a subset", () => {
    expect(getEligibility({ build: { subset: true } })).toEqual({
      eligible: false,
      reasons: ["subset"],
    });
  });

  it("reports every unmet reason", () => {
    expect(
      getEligibility({
        build: { type: "check", subset: true },
        valid: false,
      }),
    ).toEqual({
      eligible: false,
      reasons: ["tests-failed", "subset", "not-approved"],
    });
  });

  it("only reports incompleteness while the build is not complete", () => {
    expect(
      getEligibility({
        build: { jobStatus: "progress", type: "check", subset: true },
        valid: false,
      }),
    ).toEqual({ eligible: false, reasons: ["build-incomplete"] });
  });
});
