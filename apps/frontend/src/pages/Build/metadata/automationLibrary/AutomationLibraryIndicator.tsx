import { HTMLAttributes } from "react";

import { Tooltip } from "@/ui/Tooltip";

import cypressIcon from "./logos/cypress.svg";
import playwrightIcon from "./logos/playwright.svg";
import puppeteerIcon from "./logos/puppeteer.svg";
import storybookIcon from "./logos/storybook.svg";

const Icons: Record<string, string> = {
  "@playwright/test": playwrightIcon,
  playwright: playwrightIcon,
  "playwright-core": playwrightIcon,
  cypress: cypressIcon,
  puppeteer: puppeteerIcon,
  "@storybook/test-runner": storybookIcon,
};

export function AutomationLibraryIndicator({
  automationLibrary,
  ...props
}: HTMLAttributes<HTMLImageElement> & {
  automationLibrary: {
    name: string;
    version: string;
  };
}) {
  const icon = Icons[automationLibrary.name];

  if (!icon) {
    return null;
  }

  return (
    <Tooltip
      content={`${automationLibrary.name} v${automationLibrary.version}`}
    >
      <img src={icon} alt={automationLibrary.name} {...props} />
    </Tooltip>
  );
}
