import { describe, expect, it } from "vitest";

import { checkCanViewMedia, getMediaPermissions } from "./permissions";

describe("getMediaPermissions", () => {
  it("gives an admin everything", () => {
    expect(
      getMediaPermissions({
        visibility: "team",
        membershipPermissions: ["admin", "review", "view"],
      }),
    ).toEqual(["view", "comment", "delete"]);
  });

  it("lets a reviewer comment but not delete", () => {
    // Deleting breaks a share URL that may already be pasted somewhere, so it
    // stays an administrator's call.
    expect(
      getMediaPermissions({
        visibility: "team",
        membershipPermissions: ["review", "view"],
      }),
    ).toEqual(["view", "comment"]);
  });

  it("gives a read-only member view alone", () => {
    // Media is project-scoped, so membership on the project is what grants access.
    expect(
      getMediaPermissions({
        visibility: "team",
        membershipPermissions: ["view"],
      }),
    ).toEqual(["view"]);
  });

  it("gives an outsider nothing on a team media", () => {
    expect(
      getMediaPermissions({ visibility: "team", membershipPermissions: [] }),
    ).toEqual([]);
  });

  it("gives an anonymous visitor view on a public media", () => {
    // They are looking at it — reporting no permissions at all would contradict
    // the page they were just served.
    expect(
      getMediaPermissions({ visibility: "public", membershipPermissions: [] }),
    ).toEqual(["view"]);
  });

  it("still withholds writes on a public media", () => {
    // Public governs reading, never writing: a link is not a grant to comment on
    // or delete someone else's media.
    expect(
      getMediaPermissions({ visibility: "public", membershipPermissions: [] }),
    ).not.toContain("comment");
  });
});

describe("checkCanViewMedia", () => {
  it("lets anyone open a public media", () => {
    // The whole point: a pull request reviewer with no Argos account.
    expect(
      checkCanViewMedia({ visibility: "public", membershipPermissions: [] }),
    ).toBe(true);
  });

  it("lets a project member open a team media", () => {
    expect(
      checkCanViewMedia({
        visibility: "team",
        membershipPermissions: ["view"],
      }),
    ).toBe(true);
  });

  it("refuses a team media to someone who is not a member", () => {
    // Membership permissions are empty for outsiders and anonymous visitors —
    // even on a public project, whose public "view" must not reach team media.
    expect(
      checkCanViewMedia({ visibility: "team", membershipPermissions: [] }),
    ).toBe(false);
  });
});
