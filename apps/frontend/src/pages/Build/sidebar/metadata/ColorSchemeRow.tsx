import { assertNever } from "@argos/util/assertNever";

import { ScreenshotMetadataColorScheme } from "@/gql/graphql";
import { Chip } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

import type { Diff } from "../../BuildDiffState";
import { colorSchemeIcons } from "../../metadata/metadataIcons";
import { MetadataRow } from "./MetadataRow";
import { resolveColorScheme, resolveDiffMetadata } from "./utils";

/** Chip label. Short: the row is a column of chips in a narrow sidebar. */
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

/**
 * The color scheme this capture was taken in.
 *
 * Only shown when the snapshot was captured in dark: every other suite would get
 * a row saying "Light" on every snapshot, which is the default and tells nobody
 * anything. Switching to the other scheme is the variant switcher's job.
 */
export function ColorSchemeRow(props: { diff: Diff }) {
  const { diff } = props;
  const colorScheme = resolveColorScheme(resolveDiffMetadata(diff));
  if (colorScheme !== ScreenshotMetadataColorScheme.Dark) {
    return null;
  }
  return (
    <MetadataRow>
      {/* Named, not just an icon: a lone moon is a symbol the reader has to
          decode. */}
      <Tooltip content={`${getColorSchemeName(colorScheme)} color scheme`}>
        <Chip icon={colorSchemeIcons[colorScheme]} className="cursor-default">
          {getColorSchemeName(colorScheme)}
        </Chip>
      </Tooltip>
    </MetadataRow>
  );
}
