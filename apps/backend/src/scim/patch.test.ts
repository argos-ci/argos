import { describe, expect, it } from "vitest";

import { applyPatch, parsePatchOperations } from "./patch";
import type { ScimUserAttributes } from "./user";

const jane: ScimUserAttributes = {
  userName: "jane@acme.com",
  externalId: "00u1",
  email: "jane@acme.com",
  displayName: "Jane Doe",
  givenName: "Jane",
  familyName: "Doe",
  active: true,
  role: null,
};

function patch(operations: unknown[]) {
  return applyPatch(
    jane,
    parsePatchOperations({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
      Operations: operations,
    }),
  );
}

describe("applyPatch", () => {
  it.each<[string, unknown[], Partial<ScimUserAttributes>]>([
    [
      "Okta deactivation, without a path",
      [{ op: "replace", value: { active: false } }],
      { active: false },
    ],
    [
      "Entra ID deactivation, with a capitalized op and a string boolean",
      [{ op: "Replace", path: "active", value: "False" }],
      { active: false },
    ],
    [
      "reactivation",
      [{ op: "replace", path: "active", value: true }],
      { active: true },
    ],
    [
      "Entra ID work email",
      [
        {
          op: "Add",
          path: 'emails[type eq "work"].value',
          value: "jane.doe@acme.com",
        },
      ],
      { email: "jane.doe@acme.com" },
    ],
    [
      "emails as a list, keeping the primary one",
      [
        {
          op: "replace",
          path: "emails",
          value: [
            { value: "home@example.com", type: "home" },
            { value: "jane.doe@acme.com", type: "work", primary: true },
          ],
        },
      ],
      { email: "jane.doe@acme.com" },
    ],
    [
      "emails as a list without primary, keeping the work one",
      [
        {
          op: "replace",
          path: "emails",
          value: [
            { value: "home@example.com", type: "home" },
            { value: "jane.doe@acme.com", type: "work" },
          ],
        },
      ],
      { email: "jane.doe@acme.com" },
    ],
    [
      "removed email",
      [{ op: "remove", path: 'emails[type eq "work"].value' }],
      { email: null },
    ],
    [
      "name sub-attributes",
      [
        { op: "replace", path: "name.givenName", value: "Janet" },
        { op: "replace", path: "name.familyName", value: "Smith" },
      ],
      { givenName: "Janet", familyName: "Smith" },
    ],
    [
      "name as an object leaves the sub-attributes it omits",
      [{ op: "replace", path: "name", value: { familyName: "Smith" } }],
      { givenName: "Jane", familyName: "Smith" },
    ],
    [
      "removed name",
      [{ op: "remove", path: "name" }],
      { givenName: null, familyName: null },
    ],
    [
      "dotted paths without a path",
      [
        {
          op: "add",
          value: {
            "name.givenName": "Janet",
            displayName: "Janet Doe",
            externalId: "00u2",
          },
        },
      ],
      { givenName: "Janet", displayName: "Janet Doe", externalId: "00u2" },
    ],
    [
      "a path qualified with the core schema",
      [
        {
          op: "replace",
          path: "urn:ietf:params:scim:schemas:core:2.0:User:userName",
          value: "janet@acme.com",
        },
      ],
      { userName: "janet@acme.com" },
    ],
    [
      "case-insensitive attribute names",
      [{ op: "replace", path: "DisplayName", value: "Janet" }],
      { displayName: "Janet" },
    ],
    [
      "an empty string clears an optional attribute",
      [{ op: "replace", path: "displayName", value: "" }],
      { displayName: null },
    ],
    [
      "Entra ID app role",
      [
        {
          op: "Add",
          path: 'roles[primary eq "True"].value',
          value: "Owner",
        },
      ],
      { role: "owner" },
    ],
    [
      "roles as a list of objects, keeping the primary one",
      [
        {
          op: "replace",
          path: "roles",
          value: [
            { value: "member" },
            { value: "contributor", primary: "True" },
          ],
        },
      ],
      { role: "contributor" },
    ],
    [
      "roles as a list of strings",
      [{ op: "replace", value: { roles: ["member"] } }],
      { role: "member" },
    ],
    [
      "an unknown role, read as no role",
      [{ op: "replace", path: "roles", value: [{ value: "admin" }] }],
      { role: null },
    ],
    ["removed roles", [{ op: "remove", path: "roles" }], { role: null }],
    [
      "attributes Argos does not keep",
      [
        { op: "add", path: "title", value: "Engineer" },
        {
          op: "add",
          path: 'phoneNumbers[type eq "mobile"].value',
          value: "+33 6",
        },
        {
          op: "add",
          path: "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:department",
          value: "R&D",
        },
        {
          op: "add",
          value: {
            "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": {
              department: "R&D",
            },
          },
        },
        { op: "replace", path: "name.formatted", value: "Jane Doe" },
        {
          op: "replace",
          path: 'emails[type eq "work"].primary',
          value: true,
        },
      ],
      {},
    ],
  ])("applies %s", (_name, operations, expected) => {
    expect(patch(operations)).toEqual({ ...jane, ...expected });
  });

  it.each<[string, unknown[], string]>([
    [
      "a remove without a path",
      [{ op: "remove", value: { active: false } }],
      "noTarget",
    ],
    ["a removed userName", [{ op: "remove", path: "userName" }], "mutability"],
    [
      "an empty userName",
      [{ op: "replace", path: "userName", value: " " }],
      "invalidValue",
    ],
    [
      "a non-boolean active",
      [{ op: "replace", path: "active", value: "maybe" }],
      "invalidValue",
    ],
    [
      "a value that is not an object without a path",
      [{ op: "replace", value: false }],
      "invalidValue",
    ],
    [
      "a malformed path",
      [{ op: "replace", path: "emails[type eq", value: "x" }],
      "invalidPath",
    ],
  ])("rejects %s", (_name, operations, scimType) => {
    expect(() => patch(operations)).toThrow(
      expect.objectContaining({ statusCode: 400, scimType }),
    );
  });
});

describe("parsePatchOperations", () => {
  it("reads lowercased Operations", () => {
    expect(
      parsePatchOperations({
        operations: [{ op: "replace", path: "active", value: false }],
      }),
    ).toEqual([{ op: "replace", path: "active", value: false }]);
  });

  it.each([
    ["no operations", {}],
    ["empty operations", { Operations: [] }],
    ["an unknown op", { Operations: [{ op: "move", path: "active" }] }],
    ["a body that is not an object", "replace"],
  ])("rejects %s", (_name, body) => {
    expect(() => parsePatchOperations(body)).toThrow(
      expect.objectContaining({ statusCode: 400, scimType: "invalidSyntax" }),
    );
  });
});
