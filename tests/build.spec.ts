import { test, expect } from "@playwright/test";
import { argosScreenshot } from "@argos-ci/playwright";

const buildExamples = [
  { name: "orphan", number: 1 },
  { name: "reference", number: 2 },
  { name: "expired", number: 3, compare: false },
  { name: "aborted", number: 4, compare: false },
  { name: "error", number: 5, compare: false },
  { name: "changes detected", number: 6 },
  { name: "rejected", number: 8 },
  { name: "scheduled", number: 9, compare: false },
  { name: "in progress", number: 10, compare: false },
  { name: "empty", number: 13, compare: false },
  { name: "stable", number: 12 },
  { name: "stable with fail screenshots", number: 11 },
  { name: "stable with removed screenshots", number: 14 },
];

buildExamples.forEach((build) => {
  test(build.name, async ({ page, browserName }) => {
    await page.goto(`/smooth/big/builds/${build.number}`);
    await expect(page.getByText(`Build ${build.number}`)).toBeVisible();
    if (build.compare === undefined || build.compare) {
      await expect(page.getByText(`Changes from`)).toBeVisible();
    }
    await argosScreenshot(page, `build-${build.name}-${browserName}`);
  });
});
