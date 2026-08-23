import { checkIsNonNullable } from "@argos/util/checkIsNonNullable";
import { invariant } from "@argos/util/invariant";
import { useNavigate } from "react-router";

import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { LinkButton } from "@/ui/Button";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { Tooltip } from "@/ui/Tooltip";

import type { Diff } from "../../BuildDiffState";
import { BrowserIcon } from "../browser/BrowserIcon";
import { getBrowserLabel } from "../browser/browserLabels";
import {
  getUniqueBrowsers,
  hashBrowser,
  resolveDiffMetadata,
  useGetDiffPath,
  type MetadataBrowser,
} from "../utils";
import { findVariantSibling } from "./sibling";

export function BrowserSwitcher(props: { diff: Diff; siblingDiffs: Diff[] }) {
  const { diff, siblingDiffs } = props;
  const getDiffPath = useGetDiffPath();
  const metadata = resolveDiffMetadata(diff);
  const browsers = getUniqueBrowsers(
    siblingDiffs.map(resolveDiffMetadata).filter(checkIsNonNullable),
  );
  if (browsers.length < 2) {
    return null;
  }
  const activeKey = metadata?.browser ? hashBrowser(metadata.browser) : null;
  const activeIndex = browsers.findIndex((b) => hashBrowser(b) === activeKey);
  return (
    <ButtonGroup>
      {browsers.map((browser, index) => {
        const key = hashBrowser(browser);
        const isActive = activeKey === key;
        const isNextActive = (activeIndex + 1) % browsers.length === index;
        const resolvedDiff = isActive
          ? diff
          : findVariantSibling({
              diff,
              siblingDiffs,
              axis: "browser",
              value: key,
            });
        invariant(resolvedDiff, "diff cannot be null");
        return (
          <BrowserLinkButton
            key={key}
            browser={browser}
            aria-current={isActive ? "page" : undefined}
            href={getDiffPath(resolvedDiff.id) ?? ""}
            shortcutEnabled={isNextActive}
          />
        );
      })}
    </ButtonGroup>
  );
}

function BrowserLinkButton(props: {
  browser: MetadataBrowser;
  href: string;
  shortcutEnabled: boolean;
  "aria-current"?: "page";
}) {
  const { browser, shortcutEnabled, ...rest } = props;
  const navigate = useNavigate();
  const label = getBrowserLabel(browser.name);
  const tooltipContent = `${label} v${browser.version}`;
  const hotkey = useBuildHotkey("switchBrowser", () => navigate(props.href), {
    enabled: shortcutEnabled,
  });

  const button = (
    // The logo is the label: browsers are the one dimension whose icons anyone
    // reviewing snapshots can already tell apart. The name stays for a screen
    // reader, and the version for the tooltip.
    <LinkButton {...rest} variant="secondary" iconOnly aria-label={label}>
      <BrowserIcon browser={browser} />
    </LinkButton>
  );

  if (!shortcutEnabled) {
    return <Tooltip content={tooltipContent}>{button}</Tooltip>;
  }

  return (
    <HotkeyTooltip keys={hotkey.displayKeys} description={tooltipContent}>
      {button}
    </HotkeyTooltip>
  );
}
