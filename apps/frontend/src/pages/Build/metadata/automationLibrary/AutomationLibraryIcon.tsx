import { FlaskConicalIcon } from "lucide-react";

import { capitalize } from "@/util/string";

import cypressIcon from "./logos/cypress.svg";
import playwrightIcon from "./logos/playwright.svg";
import puppeteerIcon from "./logos/puppeteer.svg";
import storybookIcon from "./logos/storybook.svg";
import vitestIcon from "./logos/vitest.svg";

type AutomationLibrary = {
  label: string;
  icon?: string;
};

/**
 * Maps an automation library package name to its display label and logo.
 * Several package names can map to the same tool (e.g. `@storybook/test-runner`
 * and `@storybook/addon-vitest` are both Storybook). Tools without a logo fall
 * back to a generic icon.
 */
const automationLibraries: Record<string, AutomationLibrary> = {
  "@playwright/test": { label: "Playwright", icon: playwrightIcon },
  playwright: { label: "Playwright", icon: playwrightIcon },
  "playwright-core": { label: "Playwright", icon: playwrightIcon },
  cypress: { label: "Cypress", icon: cypressIcon },
  puppeteer: { label: "Puppeteer", icon: puppeteerIcon },
  storybook: { label: "Storybook", icon: storybookIcon },
  "@storybook/test-runner": { label: "Storybook", icon: storybookIcon },
  "@storybook/addon-vitest": { label: "Storybook", icon: storybookIcon },
  vitest: { label: "Vitest", icon: vitestIcon },
  "@vitest/browser-playwright": { label: "Vitest", icon: vitestIcon },
  webdriverio: { label: "WebdriverIO" },
  selenium: { label: "Selenium" },
};

/** Returns the display label for an automation library package name. */
export function getAutomationLibraryLabel(name: string): string {
  return automationLibraries[name.toLowerCase()]?.label ?? capitalize(name);
}

/** Returns the logo for an automation library package name, if any. */
export function getAutomationLibraryIcon(name: string): string | undefined {
  return automationLibraries[name.toLowerCase()]?.icon;
}

export function AutomationLibraryIcon(
  props: Omit<React.ComponentPropsWithRef<"img">, "src" | "alt"> &
    React.ComponentPropsWithRef<"svg"> & {
      name: string;
    },
) {
  const { name, ...rest } = props;
  const icon = automationLibraries[name.toLowerCase()]?.icon;
  if (!icon) {
    return <FlaskConicalIcon {...rest} />;
  }
  return <img src={icon} alt={name} {...rest} />;
}
