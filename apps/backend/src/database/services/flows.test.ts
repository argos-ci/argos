import { describe, expect, it } from "vitest";

import { getStepKey } from "./flows";

describe("getStepKey", () => {
  it.each([
    // The viewport variants of one call are one step, which is the whole point:
    // the canvas draws a screen once and lets the reader pick the viewport.
    [
      "chromium/supplier-invoice/loan-set-up vw-414.png",
      "chromium",
      "supplier-invoice/loan-set-up",
    ],
    [
      "chromium/supplier-invoice/loan-set-up vw-1280.png",
      "chromium",
      "supplier-invoice/loan-set-up",
    ],
    // A runner project is free to be called anything, and the prefix is
    // stripped by the name the run reports rather than by a list of browsers —
    // otherwise the same screen under two projects would look like two screens.
    ["Desktop Chrome/checkout vw-414.png", "Desktop Chrome", "checkout"],
    // Color scheme and repeat suffixes are variants too.
    ["chromium/login mode-[dark].png", "chromium", "login"],
    ["chromium/login repeat-2.png", "chromium", "login"],
    // Nothing to strip beyond the project and the extension.
    ["chromium/login.png", "chromium", "login"],
    ["login.png", "", "login"],
  ])("reads %j under project %j as %j", (name, runnerProject, expected) => {
    expect(getStepKey(name, runnerProject)).toBe(expected);
  });
});
