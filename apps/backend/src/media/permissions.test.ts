import { describe, expect, it } from "vitest";

import { checkCanViewMedia, getMediaPermissions } from "./permissions";

describe("getMediaPermissions", () => {
  it("gives an admin the library", () => {
    expect(getMediaPermissions(["admin", "view"])).toEqual(["view", "delete"]);
  });

  it("lets anyone who can see the project see its media", () => {
    // Media is project-scoped, so seeing the project is what grants access.
    expect(getMediaPermissions(["view"])).toEqual(["view"]);
  });

  it("gives an outsider nothing", () => {
    expect(getMediaPermissions([])).toEqual([]);
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
