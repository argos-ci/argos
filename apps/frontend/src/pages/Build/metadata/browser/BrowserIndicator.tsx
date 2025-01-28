import { lazy, Suspense } from "react";
import { GlobeIcon } from "lucide-react";

import { Tooltip } from "@/ui/Tooltip";

const LazyBrowserIcon = lazy(() =>
  import("./BrowserIcon").then((mod) => ({ default: mod.BrowserIcon })),
);

export function BrowserIndicator({
  browser,
  className,
}: {
  className?: string;
  browser: {
    name: string;
    version: string;
  };
}) {
  const tooltip = `${browser.name} v${browser.version}`;
  return (
    <Suspense
      fallback={
        <Tooltip content={tooltip}>
          <GlobeIcon className={className} />
        </Tooltip>
      }
    >
      <Tooltip content={tooltip}>
        <LazyBrowserIcon browser={browser} className={className} />
      </Tooltip>
    </Suspense>
  );
}
