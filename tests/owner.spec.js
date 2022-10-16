const { test, expect } = require("@playwright/test");
const { goto, argosScreenshot } = require("./utils");

test("repository list", async ({ page, browserName }) => {
  await goto({ page, link: "/callemall" });
  await expect(page.getByText("material-ui")).toBeVisible();
  await argosScreenshot(page, `owner-repository-list-${browserName}`);
});

test("settings", async ({ page, browserName }) => {
  await goto({ page, link: "/callemall/settings" });
  await argosScreenshot(page, `owner-repository-list-${browserName}`);
});
