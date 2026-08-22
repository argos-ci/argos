import { assertNever } from "@argos/util/assertNever";
import { checkIsNonNullable } from "@argos/util/checkIsNonNullable";
import { invariant } from "@argos/util/invariant";

import { ScreenshotMetadataColorScheme } from "@/gql/graphql";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { Chip, ChipLink } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

import type { Diff } from "../../BuildDiffState";
import { colorSchemeIcons } from "../metadataIcons";
import {
  getUniqueColorSchemes,
  resolveColorScheme,
  resolveDiffMetadata,
  useGetDiffPath,
} from "../utils";

/** Chip label. Short: the chip shares the toolbar with everything else. */
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
  if (!colorSchemes.includes(ScreenshotMetadataColorScheme.Dark)) {
    return null;
  }
  if (colorSchemes.length === 1) {
    const colorScheme = colorSchemes[0]!;
    return (
      // Named, not just an icon: with nothing to switch to, a lone moon is a
      // symbol the reader has to decode.
      <Tooltip content={getColorSchemeLabel(colorScheme)}>
        <Chip icon={colorSchemeIcons[colorScheme]} className="cursor-default">
          {getColorSchemeName(colorScheme)}
        </Chip>
      </Tooltip>
    );
  }
  const active = resolveColorScheme(metadata);
  return (
    <ButtonGroup>
      {colorSchemes.map((colorScheme) => {
        const isActive = active === colorScheme;
        const resolvedDiff = isActive
          ? diff
          : siblingDiffs.find(
              (d) => resolveColorScheme(resolveDiffMetadata(d)) === colorScheme,
            );
        invariant(resolvedDiff, "diff cannot be null");
        return (
          <Tooltip key={colorScheme} content={getColorSchemeLabel(colorScheme)}>
            <ChipLink
              icon={colorSchemeIcons[colorScheme]}
              className="cursor-default"
              aria-current={isActive ? "page" : undefined}
              href={getDiffPath(resolvedDiff.id) ?? ""}
            >
              {getColorSchemeName(colorScheme)}
            </ChipLink>
          </Tooltip>
        );
      })}
    </ButtonGroup>
  );
}
