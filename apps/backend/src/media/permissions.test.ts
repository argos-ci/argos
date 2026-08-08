import { describe, expect, it } from "vitest";

import { checkCanViewMedia, getMediaPermissions } from "./permissions";

describe("getMediaPermissions", () => {
  it("gives an admin the library", () => {
    expect(getMediaPermissions(["admin", "view"])).toEqual(["view", "delete"]);
  });

  it("gives a plain member nothing", () => {
    // The library spans projects a member may have no access to, so browsing it
    // is not something team membership alone earns.
    expect(getMediaPermissions(["view"])).toEqual([]);
  });

  it("gives an outsider nothing", () => {
    expect(getMediaPermissions([])).toEqual([]);
  });
});

describe("checkCanViewMedia", () => {
  it("lets anyone open a public media", () => {
    // The whole point: a pull request reviewer with no Argos account.
    expect(
      checkCanViewMedia({ visibility: "public", accountPermissions: [] }),
    ).toBe(true);
  });

  it("lets any team member open a team media, not just admins", () => {
    // Following a link somebody on your team shared is a lower bar than browsing
    // everything the team ever uploaded.
    expect(
      checkCanViewMedia({ visibility: "team", accountPermissions: ["view"] }),
    ).toBe(true);
  });

  it("refuses a team media to someone outside the team", () => {
    expect(
      checkCanViewMedia({ visibility: "team", accountPermissions: [] }),
    ).toBe(false);
  });
});
