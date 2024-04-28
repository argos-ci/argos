import type { Build, BuildType, ScreenshotBucket } from "@/database/models";

/**
 * Get the base bucket for a build.
 */
export type BuildStrategy<TCtx> = {
  detect: (build: Build) => boolean;
  getContext: (build: Build) => Promise<TCtx | null> | TCtx | null;
  getBaseScreenshotBucket: (build: Build) => Promise<ScreenshotBucket | null>;
  getBuildType: (
    input: {
      baseScreenshotBucket: ScreenshotBucket | null;
      compareScreenshotBucket: ScreenshotBucket;
    },
    ctx: TCtx,
  ) => BuildType;
};
