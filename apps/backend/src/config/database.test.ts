import { describe, expect, it } from "vitest";

import { explainRdsTokenFailure } from "./database";

// The AWS SDK's wording when the login session is gone. On the login screen it
// reads as if the Argos session had expired, which is the whole reason this
// message exists.
const EXPIRED = new Error("Your session has expired. Please reauthenticate.");

describe("explainRdsTokenFailure", () => {
  it("points a developer at the command that fixes it", () => {
    const message = explainRdsTokenFailure({
      error: EXPIRED,
      target: "prod-ro",
      user: "argos_dev_ro",
    });
    expect(message).toContain("AWS session");
    expect(message).toContain("aws login");
    expect(message).toContain("Your session has expired.");
  });

  it("points production at the missing grant instead", () => {
    const message = explainRdsTokenFailure({
      error: EXPIRED,
      target: "local",
      user: "argos_iam",
    });
    expect(message).toContain("rds-db:connect");
    expect(message).toContain("argos_iam");
    expect(message).not.toContain("aws login");
  });

  it("keeps a non-Error cause readable", () => {
    expect(
      explainRdsTokenFailure({
        error: "socket hang up",
        target: "prod-ro",
        user: "argos_dev_ro",
      }),
    ).toContain("socket hang up");
  });
});
