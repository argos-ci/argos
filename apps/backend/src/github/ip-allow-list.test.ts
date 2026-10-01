import { describe, expect, it } from "vitest";

import { parseIpAllowListOwner } from "./ip-allow-list";

describe("parseIpAllowListOwner", () => {
  it.each([
    {
      message:
        "Although you appear to have the correct authorization credentials, the `stackav-sandbox` organization has an IP allow list enabled, and your IP address is not permitted to access this resource. - https://docs.github.com/rest/reference/apps#create-an-installation-access-token-for-an-app",
      expected: { name: "stackav-sandbox", kind: "organization" },
    },
    {
      message:
        "This installation has been suspended - https://docs.github.com/rest/reference/apps#create-an-installation-access-token-for-an-app",
      expected: null,
    },
    {
      message: "Resource not accessible by integration",
      expected: null,
    },
  ])("parses $message", ({ message, expected }) => {
    expect(parseIpAllowListOwner(message)).toEqual(expected);
  });
});
