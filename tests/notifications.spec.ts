import { WORKFLOW_TYPES } from "@argos-ci/backend/src/notification/workflow-types";
import { argosScreenshot } from "@argos-ci/playwright";
import { test } from "@playwright/test";

WORKFLOW_TYPES.forEach((workflowType) => {
  test(`notification ${workflowType}`, async ({ page }) => {
    await page.goto(`/notification-preview/${workflowType}`);
    await argosScreenshot(page, `notification/${workflowType}`, {
      viewports: ["iphone-x", "macbook-15"],
    });
  });
});
