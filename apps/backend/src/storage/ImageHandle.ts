import { invariant } from "@argos/util/invariant";
import sharp from "sharp";

import type { FileHandle } from "./FileHandle";
import { tmpName } from "./tmp";

interface Dimensions {
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
  private async measure() {
    const filepath = await this.#fileHandle.getFilepath();
    const { width, height } = await sharp(filepath).metadata();
    invariant(width && height, "unable to get image dimensions");
    return { width, height };
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
    const [dimensions, filepath] = await Promise.all([
      this.getDimensions(),
      this.#fileHandle.getFilepath(),
    ]);

    if (
      dimensions.width > targetDimensions.width ||
      dimensions.height > targetDimensions.height ||
      (dimensions.height === targetDimensions.height &&
        dimensions.width === targetDimensions.width)
    ) {
      return filepath;
    }

    const resultFilepath = await tmpName({ postfix: ".png" });
    await sharp(filepath)
      .resize({
        ...targetDimensions,
        fit: "contain",
        position: "left top",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toFile(resultFilepath);
    return resultFilepath;
  }
}
