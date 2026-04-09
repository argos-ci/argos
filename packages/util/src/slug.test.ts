import { describe, expect, it } from "vitest";

import { SLUG_REGEX, slugify } from "./slug";

describe("slugify", () => {
  it("must slugify a string to match SLUG_REGEX pattern", () => {
    expect(slugify("ControlPlane25")).toBe("control-plane25");
    expect(slugify("&é!'lazepjfazehç")).toBe("and-e-lazepjfazehc");
    expect(slugify("&é!'lazepjfazehç!")).toBe("and-e-lazepjfazehc");
    expect(slugify("%a?eç,sq")).toBe("a-ec-sq");
    expect(slugify("foo@239")).toBe("foo-239");
  });

  it("must give a generic slug when failing to generate one from the string", () => {
    expect(slugify("淼淼自助店铺")).toMatch(SLUG_REGEX);
  });
});
