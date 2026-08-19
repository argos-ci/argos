import { describe, expect, it } from "vitest";

import { getJourneyKey } from "./flows";

describe("getJourneyKey", () => {
  it.each([
    // The SDK prefixes every name with the runner project, and a journey is the
    // same journey whichever browser walked it.
    [
      "chromium/supplier-invoice/loan-beneficiary",
      "chromium",
      "supplier-invoice",
    ],
    [
      "firefox/supplier-invoice/loan-beneficiary",
      "firefox",
      "supplier-invoice",
    ],
    // Nested folders belong to the deepest one: that is the folder the suite
    // named, and the levels above it group journeys rather than being one.
    ["chromium/logged/post-loan/loan-set-up", "chromium", "logged/post-loan"],
    // No folder left once the project is stripped: the test is the whole story.
    ["chromium/login", "chromium", null],
    // A project the name does not start with must not be stripped, or the first
    // folder of the journey would be eaten.
    ["supplier-invoice/loan-set-up", "chromium", "supplier-invoice"],
    // No runner project configured, which is what Playwright reports when the
    // config declares no `projects`.
    ["supplier-invoice/loan-set-up", "", "supplier-invoice"],
    ["login", "", null],
    // A leading slash is not a folder — it would make every name share the same
    // empty journey.
    ["/login", "", null],
  ])("reads %j under project %j as %j", (name, runnerProject, expected) => {
    expect(getJourneyKey(name, runnerProject)).toBe(expected);
  });
});
