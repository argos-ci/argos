import { GlobeIcon } from "lucide-react";

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

export function BrowserIcon({
  browser,
  ...props
}: Omit<React.ComponentPropsWithRef<"img">, "src" | "alt"> & {
  browser: {
    name: string;
  };
}) {
  const icon = Icons[browser.name];

  if (!icon) {
    return <GlobeIcon className={props.className} />;
  }

  return <img src={icon} alt={browser.name} {...props} />;
}
