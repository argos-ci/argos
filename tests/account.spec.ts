import { expect } from "@playwright/test";

import { loggedTest } from "./logged-test";

loggedTest("change name", async ({ page }) => {
  await page.goto("/gregberge/settings");
  const nameRegion = page.getByRole("region", { name: "Your Name" });
  const nameTextbox = nameRegion.getByRole("textbox", {
    name: "Name",
    exact: true,
  });
  expect(await nameTextbox.inputValue()).toBe("Greg Bergé");
  await nameTextbox.fill("James Bond");
  await nameRegion.getByRole("button", { name: "Save" }).click();
  await expect(nameRegion.getByText("Saved")).toBeVisible();
  await page.reload();
  expect(await nameTextbox.inputValue()).toBe("James Bond");
});
