import { assertNever } from "@argos/util/assertNever";
import { checkIsNonNullable } from "@argos/util/checkIsNonNullable";
import { invariant } from "@argos/util/invariant";

import { ScreenshotMetadataColorScheme } from "@/gql/graphql";
import { LinkButton } from "@/ui/Button";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { Tooltip } from "@/ui/Tooltip";

import type { Diff } from "../../BuildDiffState";
import { colorSchemeIcons } from "../metadataIcons";
import {
  getUniqueColorSchemes,
  resolveColorScheme,
  resolveDiffMetadata,
  useGetDiffPath,
} from "../utils";
import { findVariantSibling } from "./sibling";
import {
  getVariantStatus,
  VariantStatusIcon,
  withVariantStatus,
} from "./VariantStatus";

function getColorSchemeName(colorScheme: ScreenshotMetadataColorScheme) {
  switch (colorScheme) {
    case ScreenshotMetadataColorScheme.Light:
      return "Light";
    case ScreenshotMetadataColorScheme.Dark:
      return "Dark";
    default:
      assertNever(colorScheme, `Unknown color scheme: ${colorScheme}`);
  }
}

function getColorSchemeLabel(colorScheme: ScreenshotMetadataColorScheme) {
  return `${getColorSchemeName(colorScheme)} color scheme`;
}

export function ColorSchemeSwitcher(props: {
  diff: Diff;
  siblingDiffs: Diff[];
}) {
  const { diff, siblingDiffs } = props;
  const getDiffPath = useGetDiffPath();
  const metadata = resolveDiffMetadata(diff);
  const colorSchemes = getUniqueColorSchemes(
    siblingDiffs.map(resolveDiffMetadata).filter(checkIsNonNullable),
  );
  if (colorSchemes.length < 2) {
    return null;
  }
  const active = resolveColorScheme(metadata);
  return (
    <ButtonGroup>
      {colorSchemes.map((colorScheme) => {
        const isActive = active === colorScheme;
        const resolvedDiff = isActive
          ? diff
          : findVariantSibling({
              diff,
              siblingDiffs,
              axis: "colorScheme",
              value: colorScheme,
            });
        invariant(resolvedDiff, "diff cannot be null");
        const Icon = colorSchemeIcons[colorScheme];
        const status = getVariantStatus(resolvedDiff);
        const label = withVariantStatus(
          getColorSchemeLabel(colorScheme),
          status,
        );
        return (
          // A sun against a moon: with the two side by side, each names the
          // other — the trap of a lone undecodable moon needs a lone moon.
          <Tooltip key={colorScheme} content={label}>
            <LinkButton
              variant="secondary"
              iconOnly
              className="gap-1"
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              href={getDiffPath(resolvedDiff.id) ?? ""}
            >
              <Icon />
              {status ? <VariantStatusIcon status={status} /> : null}
            </LinkButton>
          </Tooltip>
        );
      })}
    </ButtonGroup>
  );
}
