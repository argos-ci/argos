import { describe, expect, it } from "vitest";

import { OAuthScopeLevel } from "@/gql/graphql";

import {
  getConsentPresets,
  getGrantedScopes,
  getInitialConsentValues,
} from "./oauth-consent";

const { Read, Write, Admin } = OAuthScopeLevel;

/** The backend's catalog, in the order it returns scopes. */
const ALL_SCOPES = [
  { scope: "profile", level: Read },
  { scope: "projects:read", level: Read },
  { scope: "projects:write", level: Admin },
  { scope: "builds:write", level: Write },
  { scope: "reviews:write", level: Write },
  { scope: "comments:read", level: Read },
  { scope: "comments:write", level: Write },
  { scope: "media:read", level: Read },
  { scope: "media:write", level: Write },
  { scope: "account:admin", level: Admin },
];

function pick(...names: string[]) {
  return ALL_SCOPES.filter((scope) => names.includes(scope.scope));
}

const READ_SCOPES = ["profile", "projects:read", "comments:read", "media:read"];
const WRITE_SCOPES = [
  "profile",
  "projects:read",
  "builds:write",
  "reviews:write",
  "comments:read",
  "comments:write",
  "media:read",
  "media:write",
];

describe("getConsentPresets", () => {
  it.each([
    {
      name: "every level requested",
      scopes: ALL_SCOPES,
      expected: [
        { level: Read, scopes: READ_SCOPES },
        { level: Write, scopes: WRITE_SCOPES },
        { level: Admin, scopes: ALL_SCOPES.map((scope) => scope.scope) },
      ],
    },
    {
      name: "read scopes only",
      scopes: pick("profile", "projects:read"),
      expected: [{ level: Read, scopes: ["profile", "projects:read"] }],
    },
    {
      name: "no write scope",
      scopes: pick("profile", "projects:read", "account:admin"),
      expected: [
        { level: Read, scopes: ["profile", "projects:read"] },
        {
          level: Admin,
          scopes: ["profile", "projects:read", "account:admin"],
        },
      ],
    },
    {
      name: "no read scope",
      scopes: pick("builds:write"),
      expected: [{ level: Write, scopes: ["builds:write"] }],
    },
    { name: "nothing requested", scopes: [], expected: [] },
  ])("$name", ({ scopes, expected }) => {
    expect(getConsentPresets(scopes)).toEqual(expected);
  });
});

describe("getInitialConsentValues", () => {
  const accountIds = ["me", "acme"];

  it.each([
    {
      name: "starts at read and write",
      scopes: ALL_SCOPES,
      remembered: null,
      access: Write,
    },
    {
      name: "starts below read and write when nothing is in between",
      scopes: pick("profile", "projects:read", "account:admin"),
      remembered: null,
      access: Read,
    },
    {
      name: "starts at the only level requested",
      scopes: pick("account:admin"),
      remembered: null,
      access: Admin,
    },
    {
      name: "restores the remembered level",
      scopes: ALL_SCOPES,
      remembered: { access: Read, scopes: [], accountIds: "all" as const },
      access: Read,
    },
    {
      name: "fits a remembered level to what is requested",
      scopes: pick("profile", "projects:read", "comments:write"),
      remembered: { access: Admin, scopes: [], accountIds: "all" as const },
      access: Write,
    },
    {
      name: "falls back when custom has nothing to toggle",
      scopes: pick("profile"),
      remembered: {
        access: "custom" as const,
        scopes: ["profile"],
        accountIds: "all" as const,
      },
      access: Read,
    },
  ])("$name", ({ scopes, remembered, access }) => {
    expect(
      getInitialConsentValues({ scopes, accountIds, remembered }).access,
    ).toBe(access);
  });

  it("restores custom scopes that are still requested", () => {
    expect(
      getInitialConsentValues({
        scopes: pick("profile", "projects:read", "comments:read"),
        accountIds,
        remembered: {
          access: "custom",
          scopes: ["profile", "comments:read", "media:read"],
          accountIds: "all",
        },
      }),
    ).toEqual({
      access: "custom",
      customScopes: ["comments:read"],
      accountIds,
    });
  });

  it.each([
    { remembered: "all" as const, expected: accountIds },
    { remembered: ["acme", "gone"], expected: ["acme"] },
    { remembered: ["gone"], expected: accountIds },
  ])(
    "grants accounts $expected for $remembered",
    ({ remembered, expected }) => {
      expect(
        getInitialConsentValues({
          scopes: ALL_SCOPES,
          accountIds,
          remembered: { access: Write, scopes: [], accountIds: remembered },
        }).accountIds,
      ).toEqual(expected);
    },
  );
});

describe("getGrantedScopes", () => {
  it("grants every requested scope up to the preset's level", () => {
    expect(
      getGrantedScopes({ scopes: ALL_SCOPES, access: Write, customScopes: [] }),
    ).toEqual(WRITE_SCOPES);
  });

  it("grants the ticked scopes and the required ones under custom", () => {
    expect(
      getGrantedScopes({
        scopes: ALL_SCOPES,
        access: "custom",
        customScopes: ["media:write", "comments:read"],
      }),
    ).toEqual(["profile", "comments:read", "media:write"]);
  });
});
