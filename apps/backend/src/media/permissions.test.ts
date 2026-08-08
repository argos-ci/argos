import { describe, expect, it } from "vitest";

import { checkCanViewMedia, getMediaPermissions } from "./permissions";

describe("getMediaPermissions", () => {
  it("gives an admin everything", () => {
    expect(
      getMediaPermissions({
        visibility: "team",
        projectPermissions: ["admin", "review", "view"],
      }),
    ).toEqual(["view", "comment", "delete"]);
  });

  it("lets a reviewer comment but not delete", () => {
    // Deleting breaks a share URL that may already be pasted somewhere, so it
    // stays an administrator's call.
    expect(
      getMediaPermissions({
        visibility: "team",
        projectPermissions: ["review", "view"],
      }),
    ).toEqual(["view", "comment"]);
  });

  it("gives a read-only viewer view alone", () => {
    // Media is project-scoped, so seeing the project is what grants access.
    expect(
      getMediaPermissions({
        visibility: "team",
        projectPermissions: ["view"],
      }),
    ).toEqual(["view"]);
  });

  it("gives an outsider nothing on a team media", () => {
    expect(
      getMediaPermissions({ visibility: "team", projectPermissions: [] }),
    ).toEqual([]);
  });

  it("gives an anonymous visitor view on a public media", () => {
    // They are looking at it — reporting no permissions at all would contradict
    // the page they were just served.
    expect(
      getMediaPermissions({ visibility: "public", projectPermissions: [] }),
    ).toEqual(["view"]);
  });

  it("still withholds writes on a public media", () => {
    // Public governs reading, never writing: a link is not a grant to comment on
    // or delete someone else's media.
    expect(
      getMediaPermissions({ visibility: "public", projectPermissions: [] }),
    ).not.toContain("comment");
  });
});

describe("checkCanViewMedia", () => {
  it("lets anyone open a public media", () => {
    // The whole point: a pull request reviewer with no Argos account.
    expect(
      checkCanViewMedia({ visibility: "public", projectPermissions: [] }),
    ).toBe(true);
  });

  it("lets anyone with project access open a team media", () => {
    expect(
      checkCanViewMedia({ visibility: "team", projectPermissions: ["view"] }),
    ).toBe(true);
  });

  it("refuses a team media to someone without project access", () => {
    expect(
      checkCanViewMedia({ visibility: "team", projectPermissions: [] }),
    ).toBe(false);
  });
});
