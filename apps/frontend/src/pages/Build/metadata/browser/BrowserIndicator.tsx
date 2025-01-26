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
  return (
    <Tooltip content={`${browser.name} v${browser.version}`}>
      <Suspense fallback={<GlobeIcon className={className} />}>
        <LazyBrowserIcon browser={browser} className={className} />
      </Suspense>
    </Tooltip>
  );
}
