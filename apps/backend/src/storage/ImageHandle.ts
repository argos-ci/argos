import { invariant } from "@argos/util/invariant";
import * as Sentry from "@sentry/node";

import type { FileHandle } from "./FileHandle";
import { getImageMetadata, resizeImage } from "./sharp";
import { tmpName } from "./tmp";

export interface Dimensions {
  width: number;
  height: number;
}

export class ImageHandle {
  #fileHandle: FileHandle;
  #dimensions: Dimensions | null = null;
  #measurePromise: Promise<Dimensions> | null = null;

  constructor(args: { fileHandle: FileHandle }) {
    this.#fileHandle = args.fileHandle;
  }

  /**
   * Measure the image dimensions.
   */
  private async measure(): Promise<Dimensions> {
    return Sentry.startSpan(
      {
        name: "ImageHandle.measure",
      },
      async () => {
        const filepath = await this.#fileHandle.getFilepath();
        const { width, height } = await getImageMetadata({ filepath });
        invariant(width && height, "unable to get image dimensions");
        return { width, height };
      },
    );
  }

  /**
   * Get the image dimensions.
   */
  getDimensions(): Promise<Dimensions> {
    if (this.#dimensions) {
      return Promise.resolve(this.#dimensions);
    }
    if (this.#measurePromise) {
      return this.#measurePromise;
    }
    this.#measurePromise = this.measure();
    return this.#measurePromise;
  }

  /**
   * Enlarge the image to the target dimensions if needed.
   */
  async enlarge(targetDimensions: Dimensions): Promise<string> {
    return Sentry.startSpan(
      {
        name: "ImageHandle.enlarge",
        attributes: {
          "argos.image.target_width": targetDimensions.width,
          "argos.image.target_height": targetDimensions.height,
        },
      },
      async () => {
        const [dimensions, filepath] = await Promise.all([
          this.getDimensions(),
          this.#fileHandle.getFilepath(),
        ]);

        if (
          (dimensions.height === targetDimensions.height &&
            dimensions.width === targetDimensions.width) ||
          dimensions.width > targetDimensions.width ||
          dimensions.height > targetDimensions.height
        ) {
          return filepath;
        }

        const resultFilepath = await tmpName({ postfix: ".png" });
        await resizeImage({
          inputPath: filepath,
          outputPath: resultFilepath,
          width: targetDimensions.width,
          height: targetDimensions.height,
        });
        return resultFilepath;
      },
    );
  }
}
