import { Tooltip } from "@/ui/Tooltip";

import chromeIcon from "./logos/chrome.svg";
import chromiumIcon from "./logos/chromium.svg";
import edgeIcon from "./logos/edge.svg";
import electronIcon from "./logos/electron.svg";
import firefoxIcon from "./logos/firefox.svg";
import safariIcon from "./logos/safari.svg";

const Icons: Record<string, string> = {
  edge: edgeIcon,
  firefox: firefoxIcon,
  safari: safariIcon,
  chrome: chromeIcon,
  chromium: chromiumIcon,
  electron: electronIcon,
};

export function BrowserIndicator({
  browser,
  ...props
}: Omit<React.ComponentPropsWithRef<"img">, "src" | "alt"> & {
  browser: {
    name: string;
    version: string;
  };
}) {
  const icon = Icons[browser.name];

  if (!icon) {
    return null;
  }

  return (
    <Tooltip content={`${browser.name} v${browser.version}`}>
      <img src={icon} alt={browser.name} {...props} />
    </Tooltip>
  );
}
