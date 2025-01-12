import { argosScreenshot } from "@argos-ci/playwright";
import { test } from "@playwright/test";

import { WORKFLOW_TYPES } from "../apps/backend/src/notification/workflow-types";

WORKFLOW_TYPES.forEach((workflowType) => {
  test(`notification ${workflowType}`, async ({ page }) => {
    await page.goto(`/notification-preview/${workflowType}`);
    await argosScreenshot(page, `notification/${workflowType}`, {
      viewports: ["iphone-x", "macbook-15"],
    });
  });
});
