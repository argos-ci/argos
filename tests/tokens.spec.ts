import { expect } from "@playwright/test";

import { loggedTest } from "./logged-test";

loggedTest("tokens - create, rename and delete", async ({ page, auth }) => {
  await page.goto(`/${auth.account.slug}/settings/tokens`);

  await page.getByRole("button", { name: "Generate new token" }).click();
  const createDialog = page.getByRole("dialog", {
    name: "Create Personal Access Token",
  });
  await createDialog
    .getByRole("textbox", { name: "Token name" })
    .fill("CI token");
  await createDialog.getByRole("button", { name: "Create token" }).click();

  const createdDialog = page.getByRole("dialog", { name: "Token Created" });
  await expect(createdDialog).toBeVisible();
  await createdDialog.getByRole("button", { name: "Close" }).click();
  await expect(createdDialog).toBeHidden();

  const row = page.getByRole("row").filter({ hasText: "CI token" });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "CI token options" }).click();
  await page.getByRole("option", { name: "Rename" }).click();
  const editDialog = page.getByRole("dialog", { name: "Rename Token" });
  await editDialog
    .getByRole("textbox", { name: "Token name" })
    .fill("Release token");
  await editDialog.getByRole("button", { name: "Save" }).click();
  await expect(editDialog).toBeHidden();

  const renamedRow = page.getByRole("row").filter({ hasText: "Release token" });
  await expect(renamedRow).toBeVisible();

  await renamedRow
    .getByRole("button", { name: "Release token options" })
    .click();
  await page.getByRole("option", { name: "Delete" }).click();
  const deleteDialog = page.getByRole("alertdialog", { name: "Delete Token" });
  await deleteDialog.getByRole("button", { name: "Delete" }).click();
  await expect(deleteDialog).toBeHidden();
  await expect(renamedRow).toBeHidden();
});
