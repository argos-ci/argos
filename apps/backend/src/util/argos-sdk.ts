import type { ScreenshotMetadata } from "@argos/schemas/screenshot-metadata";

/**
 * Name of the npm package for the Storybook Argos SDK.
 * Screenshots it uploads are Storybook screenshots, see
 * {@link checkIsStorybookScreenshot}.
 */
export const ARGOS_STORYBOOK_SDK_NAME = "@argos-ci/storybook";

/**
 * Automation libraries reported by screenshots of Storybook stories, whatever
 * SDK uploads them: `@argos-ci/vitest` reports `storybook` (portable stories)
 * or `@storybook/addon-vitest` when the test renders a story.
 */
export const STORYBOOK_AUTOMATION_LIBRARIES = [
  "storybook",
  "@storybook/addon-vitest",
  "@storybook/test-runner",
];

/**
 * Check if a screenshot is a Storybook one: uploaded by the Storybook SDK, or
 * reporting a Storybook automation library.
 *
 * Mirrored in SQL by the bucket count of `finalizeBuild`, the one Storybook
 * screenshots are billed from.
 */
export function checkIsStorybookScreenshot(
  metadata:
    | Pick<ScreenshotMetadata, "sdk" | "automationLibrary">
    | null
    | undefined,
): boolean {
  if (!metadata) {
    return false;
  }
  return (
    metadata.sdk.name === ARGOS_STORYBOOK_SDK_NAME ||
    STORYBOOK_AUTOMATION_LIBRARIES.includes(metadata.automationLibrary.name)
  );
}
