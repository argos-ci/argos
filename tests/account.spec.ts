import { argosScreenshot } from "@argos-ci/playwright";
import { expect } from "@playwright/test";

import { loggedTest } from "./logged-test";

loggedTest("personal settings - name", async ({ page, auth }) => {
  await page.goto(`/${auth.account.slug}/settings`);
  const region = page.getByRole("region", { name: "Your Name" });
  const textbox = region.getByRole("textbox", {
    name: "Name",
    exact: true,
  });
  expect(await textbox.inputValue()).toBe(auth.account.name);
  await textbox.fill("James Bond");
  await region.getByRole("button", { name: "Save" }).click();
  await expect(region.getByText("Saved")).toBeVisible();
  await page.reload();
  expect(await textbox.inputValue()).toBe("James Bond");
  await argosScreenshot(page, "settings/name", { element: region });
});

loggedTest("personal settings - username", async ({ page, auth }) => {
  await page.goto(`/${auth.account.slug}/settings`);
  const region = page.getByRole("region", { name: "Your Username" });
  const textbox = region.getByRole("textbox", {
    name: "URL namespace",
    exact: true,
  });
  const saveButton = region.getByRole("button", { name: "Save" });

  expect(await textbox.inputValue()).toBe(auth.account.slug);
  // Test with a "-" at the end to trigger an error
  const newSlug = `${auth.account.slug}-x`;
  await textbox.fill("invalid-");
  await saveButton.click();
  await expect(
    region.getByText(/ending with an alphanumeric character/),
  ).toBeVisible();
  await argosScreenshot(page, "settings/username", { element: region });
  await textbox.fill(newSlug);
  await saveButton.click();
  await page.waitForURL(`/${newSlug}/settings`);
  expect(await textbox.inputValue()).toBe(newSlug);
});
