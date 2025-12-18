import { unlink } from "node:fs/promises";
import { promisify } from "node:util";
import { invariant } from "@argos/util/invariant";
import type { S3Client } from "@aws-sdk/client-s3";
import mime from "mime";
import { tmpName as cbTmpName } from "tmp";
import type { TmpNameCallback, TmpNameOptions } from "tmp";

import { download as s3Download } from "./download";
import { get as s3Get } from "./get";
import { ImageHandle } from "./ImageHandle";
import { uploadFromBuffer, uploadFromFilePath } from "./upload";

export const tmpName = promisify(
  (options: TmpNameOptions, cb: TmpNameCallback) => {
    cbTmpName(options, cb);
  },
);

export interface FileHandle {
  getFilepath(): Promise<string>;
  unlink(): Promise<void>;
  getImageHandle(): ImageHandle | null;
}

export class S3FileHandle implements FileHandle {
  #s3: S3Client;
  #bucket: string;
  #key: string | null;
  #filepath: string | null;
  #buffer: Buffer | null;
  #contentType: string;
  #downloadPromise: Promise<string> | null;
  #imageHandle: ImageHandle | null = null;

  constructor(args: {
    s3: S3Client;
    bucket: string;
    buffer?: Buffer;
    contentType: string;
    filepath?: string;
    key?: string;
  }) {
    this.#contentType = args.contentType;
    this.#buffer = args.buffer ?? null;
    this.#filepath = args.filepath ?? null;
    this.#s3 = args.s3;
    this.#bucket = args.bucket;
    this.#key = args.key ?? null;
    this.#downloadPromise = null;
    this.#imageHandle = args.contentType.startsWith("image/")
      ? new ImageHandle({ fileHandle: this })
      : null;
  }

  private download(): Promise<string> {
    if (this.#downloadPromise) {
      return this.#downloadPromise;
    }
    const run = async () => {
      invariant(this.#key, "missing key");
      const result = await s3Get({
        s3: this.#s3,
        Bucket: this.#bucket,
        Key: this.#key,
      });
      invariant(result.ContentType, "missing content type");
      const ext = mime.getExtension(result.ContentType);
      if (!ext) {
        throw new Error(
          `Unable to determine file extension for ${result.ContentType}`,
        );
      }
      const outputPath = await tmpName({ postfix: `.${ext}` });
      await s3Download(result, outputPath);
      this.#filepath = outputPath;
      return this.#filepath;
    };
    this.#downloadPromise = run();
    return this.#downloadPromise;
  }

  getImageHandle() {
    return this.#imageHandle;
  }

  getKey() {
    invariant(this.#key, "missing key");
    return this.#key;
  }

  getFilepath() {
    if (this.#filepath) {
      return Promise.resolve(this.#filepath);
    }
    return this.download();
  }

  async unlink() {
    if (!this.#filepath && !this.#downloadPromise) {
      return;
    }
    const filepath = await this.getFilepath();
    await unlink(filepath);
  }

  async upload(): Promise<string> {
    const result = await (async () => {
      // If there is a buffer, we use it for upload
      if (this.#buffer) {
        invariant(this.#contentType, "missing content type");
        return uploadFromBuffer({
          s3: this.#s3,
          Bucket: this.#bucket,
          buffer: this.#buffer,
          contentType: this.#contentType,
          ...(this.#key && { Key: this.#key }),
        });
      }
      if (this.#filepath) {
        return uploadFromFilePath({
          s3: this.#s3,
          Bucket: this.#bucket,
          inputPath: this.#filepath,
          ...(this.#key && { Key: this.#key }),
        });
      }
      throw new Error("No filepath or buffer");
    })();

    this.#key = result.Key;
    return this.#key;
  }
}

export class LocalFileHandle implements FileHandle {
  #filepath: string;
  #imageHandle: ImageHandle | null = null;

  constructor(args: { filepath: string }) {
    this.#filepath = args.filepath;
    this.#imageHandle = mime.getType(this.#filepath)?.startsWith("image/")
      ? new ImageHandle({ fileHandle: this })
      : null;
  }

  getImageHandle() {
    return this.#imageHandle;
  }

  async getFilepath() {
    return this.#filepath;
  }

  async unlink() {
    // We do not remove images from the local filesystem (used in tests)
  }
}
