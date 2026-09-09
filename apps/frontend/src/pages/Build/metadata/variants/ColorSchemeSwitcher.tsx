import { assertNever } from "@argos/util/assertNever";
import { checkIsNonNullable } from "@argos/util/checkIsNonNullable";
import { invariant } from "@argos/util/invariant";
import { useNavigate } from "react-router";

import { ScreenshotMetadataColorScheme } from "@/gql/graphql";
import { LinkButton } from "@/ui/Button";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { Tooltip } from "@/ui/Tooltip";

import type { Diff } from "../../BuildDiffState";
import { FilterContextMenu } from "../filters/FilterContextMenu";
import { getFilterKey } from "../filters/util";
import { MetadataCategory } from "../metadataCategories";
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
  type VariantStatus,
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
        return (
          <ColorSchemeLinkButton
            key={colorScheme}
            colorScheme={colorScheme}
            status={getVariantStatus(resolvedDiff)}
            isActive={isActive}
            href={getDiffPath(resolvedDiff.id) ?? ""}
          />
        );
      })}
    </ButtonGroup>
  );
}

function ColorSchemeLinkButton(props: {
  colorScheme: ScreenshotMetadataColorScheme;
  status: VariantStatus | null;
  href: string;
  isActive: boolean;
}) {
  const { colorScheme, status, href, isActive } = props;
  const navigate = useNavigate();
  const Icon = colorSchemeIcons[colorScheme];
  const label = withVariantStatus(getColorSchemeLabel(colorScheme), status);
  return (
    // A sun against a moon: with the two side by side, each names the other —
    // the trap of a lone undecodable moon needs a lone moon.
    <Tooltip content={label}>
      {/* Light is what a snapshot saying nothing resolves to, so the segment
          can name a value no snapshot actually carries — the menu keeps itself
          out of the way when the filter has no such value to offer. */}
      <FilterContextMenu
        filterKey={getFilterKey({
          category: MetadataCategory.colorScheme,
          value: colorScheme,
        })}
        onFilterAdded={isActive || !href ? undefined : () => navigate(href)}
      >
        <LinkButton
          href={href}
          aria-current={isActive ? "page" : undefined}
          variant="secondary"
          iconOnly
          className="gap-1"
          aria-label={label}
        >
          <Icon />
          {status ? <VariantStatusIcon status={status} /> : null}
        </LinkButton>
      </FilterContextMenu>
    </Tooltip>
  );
}
