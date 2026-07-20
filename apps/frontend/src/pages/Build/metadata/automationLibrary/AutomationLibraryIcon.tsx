import { clsx } from "clsx";
import { FlaskConicalIcon } from "lucide-react";

import { capitalize } from "@/util/string";

import cypressDarkIcon from "./logos/cypress-dark.svg";
import cypressIcon from "./logos/cypress.svg";
import playwrightIcon from "./logos/playwright.svg";
import puppeteerIcon from "./logos/puppeteer.svg";
import storybookIcon from "./logos/storybook.svg";
import vitestIcon from "./logos/vitest.svg";
import webdriverioIcon from "./logos/webdriverio.svg";

type AutomationLibrary = {
  label: string;
  icon?: string;
  /** Alternative logo used in dark mode when the default one is illegible. */
  darkIcon?: string;
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
  cypress: { label: "Cypress", icon: cypressIcon, darkIcon: cypressDarkIcon },
  puppeteer: { label: "Puppeteer", icon: puppeteerIcon },
  storybook: { label: "Storybook", icon: storybookIcon },
  "@storybook/test-runner": { label: "Storybook", icon: storybookIcon },
  "@storybook/addon-vitest": { label: "Storybook", icon: storybookIcon },
  vitest: { label: "Vitest", icon: vitestIcon },
  "@vitest/browser-playwright": { label: "Vitest", icon: vitestIcon },
  webdriverio: { label: "WebdriverIO", icon: webdriverioIcon },
  selenium: { label: "Selenium" },
};

/** Returns the display label for an automation library package name. */
export function getAutomationLibraryLabel(name: string): string {
  return automationLibraries[name.toLowerCase()]?.label ?? capitalize(name);
}

export function AutomationLibraryIcon(
  props: Omit<React.ComponentPropsWithRef<"img">, "src" | "alt"> &
    React.ComponentPropsWithRef<"svg"> & {
      name: string;
    },
) {
  const { name, ...rest } = props;
  const library = automationLibraries[name.toLowerCase()];
  if (!library?.icon) {
    return <FlaskConicalIcon {...rest} />;
  }
  if (library.darkIcon) {
    return (
      <>
        <img
          src={library.icon}
          alt={name}
          {...rest}
          className={clsx(rest.className, "dark:hidden")}
        />
        <img
          src={library.darkIcon}
          alt={name}
          {...rest}
          className={clsx(rest.className, "hidden dark:block")}
        />
      </>
    );
  }
  return <img src={library.icon} alt={name} {...rest} />;
}
