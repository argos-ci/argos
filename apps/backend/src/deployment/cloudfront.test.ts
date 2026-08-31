import {
  CNAMEAlreadyExists,
  EntityAlreadyExists,
  EntityLimitExceeded,
  EntityNotFound,
  InvalidArgument,
} from "@aws-sdk/client-cloudfront";
import { describe, expect, it } from "vitest";

import {
  checkIsDomainNotPointedError,
  checkIsTerminalTenantError,
} from "./cloudfront";

/**
 * The AWS SDK's exceptions are the only input these predicates take, and both
 * predicates decide whether a customer's domain stops being polled — so the
 * classification is worth pinning case by case rather than inferred.
 */
function awsError<T>(
  Ctor: new (opts: { message: string; $metadata: object }) => T,
  message = "boom",
): T {
  return new Ctor({ message, $metadata: {} });
}

const NOT_POINTED_MESSAGE =
  "The provided Domain Name is not valid. Could not verify Domain Name ownership. It may not be pointing to a valid CloudFront resource.";

describe("checkIsTerminalTenantError", () => {
  it.each([
    ["CNAMEAlreadyExists", awsError(CNAMEAlreadyExists)],
    ["EntityAlreadyExists", awsError(EntityAlreadyExists)],
  ])(
    "treats %s as terminal — it is a property of the hostname",
    (_l, error) => {
      expect(checkIsTerminalTenantError(error)).toBe(true);
    },
  );

  // Our own tenant quota, not anything about the customer's hostname. Treating
  // it as terminal deleted the row of every domain added during the outage and
  // permanently failed every one already waiting.
  it("does not treat EntityLimitExceeded as terminal", () => {
    expect(checkIsTerminalTenantError(awsError(EntityLimitExceeded))).toBe(
      false,
    );
  });

  it("does not treat a not-yet-pointed domain as terminal", () => {
    expect(
      checkIsTerminalTenantError(
        awsError(InvalidArgument, NOT_POINTED_MESSAGE),
      ),
    ).toBe(false);
  });

  it.each([
    ["a missing tenant", awsError(EntityNotFound)],
    ["a plain error", new Error("network")],
    ["a thrown string", "network"],
    ["null", null],
  ])("does not treat %s as terminal", (_label, error) => {
    expect(checkIsTerminalTenantError(error)).toBe(false);
  });
});

describe("checkIsDomainNotPointedError", () => {
  it("matches the ownership-verification refusal", () => {
    expect(
      checkIsDomainNotPointedError(
        awsError(InvalidArgument, NOT_POINTED_MESSAGE),
      ),
    ).toBe(true);
  });

  it("matches regardless of case", () => {
    expect(
      checkIsDomainNotPointedError(
        awsError(InvalidArgument, "COULD NOT VERIFY DOMAIN NAME OWNERSHIP"),
      ),
    ).toBe(true);
  });

  // `InvalidArgument` also covers our own misconfiguration — a distribution id
  // that is not tenant-only, say — which must not be reported to a customer as
  // "waiting for DNS".
  it("does not match another InvalidArgument", () => {
    expect(
      checkIsDomainNotPointedError(
        awsError(InvalidArgument, "The parameter ConnectionGroupId is invalid"),
      ),
    ).toBe(false);
  });

  it.each([
    ["a terminal conflict", awsError(CNAMEAlreadyExists, NOT_POINTED_MESSAGE)],
    ["a plain error", new Error(NOT_POINTED_MESSAGE)],
    ["null", null],
  ])("does not match %s", (_label, error) => {
    expect(checkIsDomainNotPointedError(error)).toBe(false);
  });
});
