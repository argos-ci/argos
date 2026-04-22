import { describe, expect, it } from "vitest";

import { formatDeploymentId, parseDeploymentId } from "./deployment";

describe("deployment ID helpers", () => {
  it("formats a deployment ID with the dep_ prefix", () => {
    expect(formatDeploymentId("123")).toMatch(/^dep_/);
  });

  it("round-trips a numberish deployment ID", () => {
    expect(parseDeploymentId(formatDeploymentId("123"))).toBe("123");
  });

  it("throws when parsing an ID without the dep_ prefix", () => {
    expect(() => parseDeploymentId("123")).toThrow(
      "Invalid deployment ID format",
    );
  });

  it("throws when parsing an invalid sqids payload", () => {
    expect(() => parseDeploymentId("dep_")).toThrow(
      "Invalid deployment ID format",
    );
  });
});
