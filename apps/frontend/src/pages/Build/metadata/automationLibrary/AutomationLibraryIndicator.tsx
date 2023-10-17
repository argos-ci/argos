import { HTMLAttributes } from "react";
import playwrightIcon from "./logos/playwright.svg";
import cypressIcon from "./logos/cypress.svg";
import puppeteerIcon from "./logos/puppeteer.svg";
import { Tooltip } from "@/ui/Tooltip";

const Icons: Record<string, string> = {
  playwright: playwrightIcon,
  cypress: cypressIcon,
  puppeteer: puppeteerIcon,
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
      disableHoverableContent
    >
      <img src={icon} alt={automationLibrary.name} {...props} />
    </Tooltip>
  );
}
