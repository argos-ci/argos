import { generatePath, useMatch } from "react-router";

import {
  ScreenshotDiffStatus,
  ScreenshotMetadataColorScheme,
} from "@/gql/graphql";
import { canParseURL } from "@/util/url";

import type { Diff } from "../../BuildDiffState";

export type Metadata = NonNullable<
  NonNullable<Diff["baseScreenshot"]>["metadata"]
>;
export type AutomationLibrary = NonNullable<Metadata["automationLibrary"]>;

export function resolveDiffMetadata(diff: Diff): Metadata | null {
  return (
    (diff.status === ScreenshotDiffStatus.Removed
      ? diff.baseScreenshot?.metadata
      : diff.compareScreenshot?.metadata) ?? null
  );
}

export function resolveColorScheme(
  metadata: Metadata | null,
): ScreenshotMetadataColorScheme {
  return metadata?.colorScheme ?? ScreenshotMetadataColorScheme.Light;
}

export function getUniqueStoryModes(metadataList: Metadata[]): string[] {
  const modes = new Set<string>();
  for (const metadata of metadataList) {
    if (metadata.story?.mode) {
      modes.add(metadata.story.mode);
    }
  }
  return Array.from(modes).sort();
}

export function useGetDiffPath() {
  const path = "/:accountSlug/:projectName/builds/:buildNumber/:diffId";
  const match = useMatch(path);
  return (diffId: string) => {
    if (!match) {
      return null;
    }
    const { accountSlug, projectName, buildNumber } = match.params;
    if (!accountSlug || !projectName || !buildNumber) {
      return null;
    }
    return generatePath(path, {
      accountSlug,
      projectName,
      buildNumber,
      diffId,
    });
  };
}

export function resolvePreviewUrlFromDeployment(input: {
  url: string | null;
  deploymentUrl: string | null;
}) {
  const { url, deploymentUrl } = input;
  if (
    !url ||
    !deploymentUrl ||
    !canParseURL(url) ||
    !canParseURL(deploymentUrl)
  ) {
    return null;
  }
  const urlObj = new URL(url);
  const result = new URL(deploymentUrl);
  result.pathname = urlObj.pathname;
  result.search = urlObj.search;
  return result.toString();
}
