const { test, expect } = require("@playwright/test");
const { argosScreenshot, goto } = require("./utils");

const buildExamples = [
  { name: "orphan", number: 1 },
  { name: "reference", number: 2 },
  { name: "expired", number: 3 },
  { name: "aborted", number: 4 },
  { name: "error", number: 5 },
  { name: "changes detected", number: 6 },
  { name: "rejected", number: 8 },
  { name: "scheduled", number: 9 },
  { name: "in progress", number: 10 },
  { name: "empty", number: 13 },
  { name: "stable", number: 12 },
  { name: "stable with fail screenshots", number: 11 },
  { name: "stable with removed screenshots", number: 14 },
];

buildExamples.forEach((build) => {
  test(build.name, async ({ page, browserName }) => {
    await goto({ page, link: `/callemall/material-ui/builds/${build.number}` });
    await expect(page.getByText(`Build #${build.number}`)).toBeVisible();
    await argosScreenshot(page, `build-${build.name}-${browserName}`);
  });
});

test("new build", async ({ page, browserName }) => {
  await goto({ page, link: "/callemall/material-ui/builds/6/new" });
  await expect(page.getByText("Baseline from")).toBeVisible();
  await argosScreenshot(page, `new-build-${browserName}`);
});
