import { invariant } from "@argos/util/invariant";
import * as Sentry from "@sentry/node";

import type { FileHandle } from "./FileHandle";
import { getImageMetadata } from "./sharp";

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
   * Path of the image file on disk, downloaded first when it lives elsewhere.
   */
  getFilepath(): Promise<string> {
    return this.#fileHandle.getFilepath();
  }
}
