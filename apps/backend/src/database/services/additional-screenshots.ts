/**
 * Compute the number of additional screenshots to bill for.
 */
export function computeAdditionalScreenshots(screenshots: {
  neutral: number;
  storybook: number;
  included: number;
}) {
  const storybookOverhead = Math.max(
    Math.min(screenshots.storybook, screenshots.included - screenshots.neutral),
    0,
  );
  return {
    neutral: Math.max(
      0,
      screenshots.neutral + storybookOverhead - screenshots.included,
    ),
    storybook: screenshots.storybook - storybookOverhead,
  };
}
