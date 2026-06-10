import { FlaskConicalIcon } from "lucide-react";

import cypressIcon from "./logos/cypress.svg";
import playwrightIcon from "./logos/playwright.svg";
import puppeteerIcon from "./logos/puppeteer.svg";
import storybookIcon from "./logos/storybook.svg";

/**
 * Maps an automation library package name to its logo. Several package names
 * can map to the same tool (e.g. `@storybook/test-runner` and
 * `@storybook/addon-vitest` are both Storybook).
 */
export const automationLibraryIcons: Record<string, string> = {
  "@playwright/test": playwrightIcon,
  playwright: playwrightIcon,
  "playwright-core": playwrightIcon,
  cypress: cypressIcon,
  puppeteer: puppeteerIcon,
  storybook: storybookIcon,
  "@storybook/test-runner": storybookIcon,
  "@storybook/addon-vitest": storybookIcon,
};

export function AutomationLibraryIcon(
  props: Omit<React.ComponentPropsWithRef<"img">, "src" | "alt"> &
    React.ComponentPropsWithRef<"svg"> & {
      name: string;
    },
) {
  const { name, ...rest } = props;
  const icon = automationLibraryIcons[name.toLowerCase()];
  if (!icon) {
    return <FlaskConicalIcon {...rest} />;
  }
  return <img src={icon} alt={name} {...rest} />;
}
