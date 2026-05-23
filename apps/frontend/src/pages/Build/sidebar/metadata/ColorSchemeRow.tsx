import { assertNever } from "@argos/util/assertNever";
import { checkIsNonNullable } from "@argos/util/checkIsNonNullable";
import { invariant } from "@argos/util/invariant";

import { ScreenshotMetadataColorScheme } from "@/gql/graphql";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { Chip, ChipLink } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

import type { Diff } from "../../BuildDiffState";
import { colorSchemeIcons } from "../../metadata/metadataIcons";
import { MetadataRow } from "./MetadataRow";
import {
  getUniqueColorSchemes,
  resolveColorScheme,
  resolveDiffMetadata,
  useGetDiffPath,
} from "./utils";

function getColorSchemeLabel(colorScheme: ScreenshotMetadataColorScheme) {
  switch (colorScheme) {
    case ScreenshotMetadataColorScheme.Light:
      return "Light color scheme";
    case ScreenshotMetadataColorScheme.Dark:
      return "Dark color scheme";
    default:
      assertNever(colorScheme, `Unknown color scheme: ${colorScheme}`);
  }
}

export function ColorSchemeRow(props: { diff: Diff; siblingDiffs: Diff[] }) {
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
      <MetadataRow>
        <Tooltip content={getColorSchemeLabel(colorScheme)}>
          <Chip
            icon={colorSchemeIcons[colorScheme]}
            className="cursor-default"
          />
        </Tooltip>
      </MetadataRow>
    );
  }
  const active = resolveColorScheme(metadata);
  return (
    <MetadataRow>
      <ButtonGroup>
        {colorSchemes.map((colorScheme) => {
          const isActive = active === colorScheme;
          const resolvedDiff = isActive
            ? diff
            : siblingDiffs.find(
                (d) =>
                  resolveColorScheme(resolveDiffMetadata(d)) === colorScheme,
              );
          invariant(resolvedDiff, "diff cannot be null");
          return (
            <Tooltip
              key={colorScheme}
              content={getColorSchemeLabel(colorScheme)}
            >
              <ChipLink
                icon={colorSchemeIcons[colorScheme]}
                className="cursor-default"
                aria-current={isActive ? "page" : undefined}
                href={getDiffPath(resolvedDiff.id) ?? ""}
              />
            </Tooltip>
          );
        })}
      </ButtonGroup>
    </MetadataRow>
  );
}
