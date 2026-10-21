import { describe, expect, it } from "vitest";

import { parseUserFilter } from "./filter";

describe("parseUserFilter", () => {
  it.each([
    ['userName eq "jane@acme.com"', "userName", "jane@acme.com"],
    ['USERNAME EQ "jane@acme.com"', "userName", "jane@acme.com"],
    ['  userName   eq   "jane@acme.com"  ', "userName", "jane@acme.com"],
    [
      'urn:ietf:params:scim:schemas:core:2.0:User:userName eq "jane@acme.com"',
      "userName",
      "jane@acme.com",
    ],
    ['externalId eq "00u1abcd"', "externalId", "00u1abcd"],
    ['id eq "42"', "id", "42"],
    ['emails.value eq "jane@acme.com"', "email", "jane@acme.com"],
    ['emails eq "jane@acme.com"', "email", "jane@acme.com"],
    ['userName eq "say \\"hi\\""', "userName", 'say "hi"'],
    ['userName eq "back\\\\slash"', "userName", "back\\slash"],
    ['userName eq ""', "userName", ""],
  ])("parses %s", (filter, attribute, value) => {
    expect(parseUserFilter(filter)).toEqual({ attribute, value });
  });

  it.each([
    'userName sw "jane"',
    'userName eq "jane" and active eq true',
    "userName eq jane",
    "active eq true",
    'displayName eq "Jane"',
    'emails[type eq "work"].value eq "jane@acme.com"',
    'userName eq "bad \\x escape"',
    "",
  ])("rejects %s", (filter) => {
    expect(() => parseUserFilter(filter)).toThrow(
      expect.objectContaining({ statusCode: 400, scimType: "invalidFilter" }),
    );
  });
});
