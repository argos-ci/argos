import { unlink } from "node:fs/promises";
import { promisify } from "node:util";
import { invariant } from "@argos/util/invariant";
import type { S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { tmpName as cbTmpName } from "tmp";
import type { TmpNameCallback, TmpNameOptions } from "tmp";

import { download as s3Download } from "./download.js";
import { get as s3Get } from "./get.js";
import { uploadFromBuffer, uploadFromFilePath } from "./upload.js";

export const tmpName = promisify(
  (options: TmpNameOptions, cb: TmpNameCallback) => {
    cbTmpName(options, cb);
  },
);

interface Dimensions {
  width: number;
  height: number;
}

export interface ImageFile {
  getFilepath(): Promise<string> | string;
  getDimensions(): Promise<Dimensions>;
  unlink(): Promise<void>;
  enlarge(targetDimensions: Dimensions): Promise<string>;
}

abstract class AbstractImageFile implements ImageFile {
  abstract getFilepath(): Promise<string> | string;
  abstract unlink(): Promise<void>;

  dimensions: Dimensions | null = null;
  _measurePromise: Promise<Dimensions> | null = null;

  async measure() {
    const filepath = await this.getFilepath();
    const { width, height } = await sharp(filepath).metadata();
    invariant(width && height, "unable to get image dimensions");
    return { width, height };
  }

  async getDimensions(): Promise<Dimensions> {
    if (this.dimensions) {
      return this.dimensions;
    }
    this._measurePromise = this._measurePromise ?? this.measure();
    return this._measurePromise;
  }

  async enlarge(targetDimensions: Dimensions): Promise<string> {
    const [dimensions, filepath] = await Promise.all([
      this.getDimensions(),
      this.getFilepath(),
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

const getExtensionFromContentType = (contentType: string) => {
  switch (contentType) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    default:
      throw new Error(`Unsupported content type: ${contentType}`);
  }
};

export class S3ImageFile extends AbstractImageFile implements ImageFile {
  s3: S3Client;
  bucket: string;
  key: string | null;
  filepath: string | null;
  buffer: Buffer | null;
  contentType: string | null;
  downloadFromS3Promise: Promise<string> | null;

  constructor(params: {
    s3: S3Client;
    bucket: string;
    buffer?: Buffer;
    contentType?: string;
    filepath?: string;
    key?: string;
    dimensions?: Dimensions | null;
  }) {
    super();
    this.buffer = params.buffer ?? null;
    this.contentType = params.contentType ?? null;
    this.filepath = params.filepath ?? null;
    this.dimensions = params.dimensions ?? null;
    this.s3 = params.s3;
    this.bucket = params.bucket;
    this.key = params.key ?? null;
    this.downloadFromS3Promise = null;
  }

  private async downloadFromS3(): Promise<string> {
    invariant(this.key, "missing key");
    const result = await s3Get({
      s3: this.s3,
      Bucket: this.bucket,
      Key: this.key,
    });
    invariant(result.ContentType, "missing content type");
    const ext = getExtensionFromContentType(result.ContentType);
    const outputPath = await tmpName({ postfix: ext });
    await s3Download(result, outputPath);
    this.filepath = outputPath;
    return this.filepath;
  }

  async getFilepath(): Promise<string> {
    if (this.filepath) {
      return this.filepath;
    }
    this.downloadFromS3Promise =
      this.downloadFromS3Promise || this.downloadFromS3();
    return this.downloadFromS3Promise;
  }

  async unlink() {
    if (!this.filepath) {
      return;
    }
    const filepath = await this.getFilepath();
    await unlink(filepath);
  }

  async upload(): Promise<string> {
    const result = await (async () => {
      // If there is a buffer, we use it for upload
      if (this.buffer) {
        invariant(this.contentType, "missing content type");
        return uploadFromBuffer({
          s3: this.s3,
          Bucket: this.bucket,
          buffer: this.buffer,
          contentType: this.contentType,
          ...(this.key && { Key: this.key }),
        });
      }
      if (this.filepath) {
        return uploadFromFilePath({
          s3: this.s3,
          Bucket: this.bucket,
          inputPath: this.filepath,
          ...(this.key && { Key: this.key }),
        });
      }
      throw new Error("No filepath or buffer");
    })();

    this.key = result.Key;
    return this.key;
  }
}

export class LocalImageFile extends AbstractImageFile implements ImageFile {
  filepath: string;

  constructor(params: { filepath: string }) {
    super();
    this.filepath = params.filepath;
  }

  getFilepath(): string {
    return this.filepath;
  }

  async unlink() {
    // We do not remove images from the local filesystem (used in tests)
  }
}
