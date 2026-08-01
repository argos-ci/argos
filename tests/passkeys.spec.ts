import { expect } from "@playwright/test";

import { createPasskeys } from "../apps/backend/src/database/seeds";
import { loggedTest } from "./logged-test";
import { getUniqueTestIdentifier, screenshot } from "./util";

loggedTest(
  "passkeys - list, rename and delete",
  async ({ page, auth }, testInfo) => {
    await createPasskeys({
      userId: auth.user.id,
      names: ["1Password", "iCloud Keychain"],
      keyPrefix: `${getUniqueTestIdentifier(testInfo)}-`,
    });

    await page.goto(`/${auth.account.slug}/settings/authentication`);

    const card = page.getByRole("group", { name: "Passkeys" });
    const toggle = card.getByRole("button", { name: "2 passkeys registered" });
    await expect(toggle).toBeVisible();

    // The credentials stay hidden until the row is expanded.
    await expect(card.getByText("1Password")).toBeHidden();
    await toggle.click();
    await expect(card.getByText("1Password")).toBeVisible();
    await screenshot(page, "settings/passkeys", { element: card });

    await card.getByRole("button", { name: "Rename 1Password" }).click();
    const editDialog = page.getByRole("dialog");
    await editDialog
      .getByRole("textbox", { name: "Device Name" })
      .fill("Work laptop");
    await screenshot(page, "settings/passkeys-edit", { element: editDialog });
    await editDialog.getByRole("button", { name: "Save" }).click();
    await expect(card.getByText("Work laptop")).toBeVisible();

    await card.getByRole("button", { name: "Delete Work laptop" }).click();
    const deleteDialog = page.getByRole("alertdialog");
    await screenshot(page, "settings/passkeys-delete", {
      element: deleteDialog,
    });
    await deleteDialog.getByRole("button", { name: "Delete" }).click();

    await expect(
      card.getByRole("button", { name: "1 passkey registered" }),
    ).toBeVisible();
    await expect(card.getByText("Work laptop")).toBeHidden();
  },
);

loggedTest("passkeys - create dialog", async ({ page, auth }) => {
  await page.goto(`/${auth.account.slug}/settings/authentication`);

  const card = page.getByRole("group", { name: "Passkeys" });
  await expect(card.getByText("No passkeys registered")).toBeVisible();
  await card.getByRole("button", { name: "Add" }).click();

  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Create Passkey" }),
  ).toBeVisible();
  await screenshot(page, "settings/passkeys-create", { element: dialog });
});

loggedTest(
  "passkeys - register then sign in with it",
  async ({ page, auth, browserName }) => {
    loggedTest.skip(
      browserName !== "chromium",
      "Virtual authenticators are a Chrome DevTools Protocol feature",
    );

    // A software authenticator inside the browser, so the ceremonies below are
    // the real thing: actual `navigator.credentials` calls, actual signatures.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("WebAuthn.enable");
    await cdp.send("WebAuthn.addVirtualAuthenticator", {
      options: {
        protocol: "ctap2",
        transport: "internal",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    });

    await page.goto(`/${auth.account.slug}/settings/authentication`);
    const card = page.getByRole("group", { name: "Passkeys" });
    await card.getByRole("button", { name: "Add" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Continue" })
      .click();
    await expect(
      card.getByRole("button", { name: "1 passkey registered" }),
    ).toBeVisible();

    // Sign out, then back in with nothing but the passkey — no email typed.
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByRole("button", { name: "Continue with Passkey" }).click();
    await expect(
      page.getByRole("button", { name: "Continue with Passkey" }),
    ).toBeHidden();

    // Reaching the settings page proves the session; "Last used" proves the
    // login went through this credential.
    await page.goto(`/${auth.account.slug}/settings/authentication`);
    await card.getByRole("button", { name: "1 passkey registered" }).click();
    await expect(card.getByText("Last used")).toBeVisible();
  },
);
