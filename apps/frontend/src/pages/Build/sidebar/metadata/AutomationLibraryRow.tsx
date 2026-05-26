import { Chip } from "@/ui/Chip";

import cypressIcon from "../../metadata/automationLibrary/logos/cypress.svg";
import playwrightIcon from "../../metadata/automationLibrary/logos/playwright.svg";
import puppeteerIcon from "../../metadata/automationLibrary/logos/puppeteer.svg";
import storybookIcon from "../../metadata/automationLibrary/logos/storybook.svg";
import { MetadataRow } from "./MetadataRow";
import type { AutomationLibrary } from "./utils";

const Icons: Record<string, string> = {
  "@playwright/test": playwrightIcon,
  playwright: playwrightIcon,
  "playwright-core": playwrightIcon,
  cypress: cypressIcon,
  puppeteer: puppeteerIcon,
  "@storybook/test-runner": storybookIcon,
  "@storybook/addon-vitest": storybookIcon,
};

export function AutomationLibraryRow(props: {
  automationLibrary: AutomationLibrary | null;
}) {
  const { automationLibrary } = props;
  if (!automationLibrary) {
    return null;
  }
  const icon = Icons[automationLibrary.name];
  if (!icon) {
    return null;
  }
  return (
    <MetadataRow>
      <Chip icon={<img src={icon} alt={automationLibrary.name} />}>
        {automationLibrary.name}
        <span className="text-low ml-1">v{automationLibrary.version}</span>
      </Chip>
    </MetadataRow>
  );
}
