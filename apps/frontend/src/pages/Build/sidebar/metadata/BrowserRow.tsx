import { lazy, Suspense } from "react";
import { checkIsNonNullable } from "@argos/util/checkIsNonNullable";
import { invariant } from "@argos/util/invariant";
import { GlobeIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { Chip, ChipLink } from "@/ui/Chip";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { Tooltip } from "@/ui/Tooltip";

import type { Diff } from "../../BuildDiffState";
import { getBrowserLabel } from "../../metadata/browser/browserLabels";
import { MetadataRow } from "./MetadataRow";
import {
  getUniqueBrowsers,
  hashBrowser,
  resolveDiffMetadata,
  useGetDiffPath,
  type MetadataBrowser,
} from "./utils";

const LazyBrowserIcon = lazy(() =>
  import("../../metadata/browser/BrowserIcon").then((mod) => ({
    default: mod.BrowserIcon,
  })),
);

function BrowserIcon(props: { browser: MetadataBrowser; className?: string }) {
  const { browser, ...rest } = props;
  return (
    <Suspense fallback={<GlobeIcon {...rest} />}>
      <LazyBrowserIcon browser={browser} {...rest} />
    </Suspense>
  );
}

export function BrowserRow(props: { diff: Diff; siblingDiffs: Diff[] }) {
  const { diff, siblingDiffs } = props;
  const getDiffPath = useGetDiffPath();
  const metadata = resolveDiffMetadata(diff);
  const browsers = getUniqueBrowsers(
    siblingDiffs.map(resolveDiffMetadata).filter(checkIsNonNullable),
  );
  if (browsers.length === 0) {
    return null;
  }
  if (browsers.length === 1) {
    const browser = browsers[0]!;
    return (
      <MetadataRow>
        <Chip icon={<BrowserIcon browser={browser} />}>
          {getBrowserLabel(browser.name)}
          <span className="text-low ml-1">v{browser.version}</span>
        </Chip>
      </MetadataRow>
    );
  }
  const activeKey = metadata?.browser ? hashBrowser(metadata.browser) : null;
  const activeIndex = browsers.findIndex((b) => hashBrowser(b) === activeKey);
  return (
    <MetadataRow>
      <ButtonGroup>
        {browsers.map((browser, index) => {
          const key = hashBrowser(browser);
          const isActive = activeKey === key;
          const isNextActive = (activeIndex + 1) % browsers.length === index;
          const resolvedDiff = isActive
            ? diff
            : siblingDiffs.find((d) => {
                const m = resolveDiffMetadata(d);
                return m?.browser && hashBrowser(m.browser) === key;
              });
          invariant(resolvedDiff, "diff cannot be null");
          return (
            <BrowserChipLink
              key={key}
              browser={browser}
              aria-current={isActive ? "page" : undefined}
              href={getDiffPath(resolvedDiff.id) ?? ""}
              shortcutEnabled={isNextActive}
            />
          );
        })}
      </ButtonGroup>
    </MetadataRow>
  );
}

function BrowserChipLink(props: {
  browser: MetadataBrowser;
  href: string;
  shortcutEnabled: boolean;
  "aria-current"?: "page";
}) {
  const { browser, shortcutEnabled, ...rest } = props;
  const navigate = useNavigate();
  const tooltipContent = `${browser.name} v${browser.version}`;
  const hotkey = useBuildHotkey("switchBrowser", () => navigate(props.href), {
    enabled: shortcutEnabled,
  });

  const chipLink = (
    <ChipLink
      {...rest}
      className="shrink-0 cursor-default"
      icon={<BrowserIcon browser={browser} />}
    >
      {getBrowserLabel(browser.name)}
    </ChipLink>
  );

  if (!shortcutEnabled) {
    return <Tooltip content={tooltipContent}>{chipLink}</Tooltip>;
  }

  return (
    <HotkeyTooltip keys={hotkey.displayKeys} description={tooltipContent}>
      {chipLink}
    </HotkeyTooltip>
  );
}
