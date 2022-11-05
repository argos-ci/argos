import type { S3Client } from "@aws-sdk/client-s3";
import gm from "gm";
import { stat, unlink } from "node:fs/promises";
import { promisify } from "node:util";
import { tmpName as cbTmpName } from "tmp";
import type { TmpNameCallback, TmpNameOptions } from "tmp";

import { download as s3Download } from "./download.js";
import { upload as s3Upload } from "./upload.js";

const gmMagick = gm.subClass({ imageMagick: true });

function transparent(
  filename: string,
  { width, height }: { width: number; height: number }
) {
  const gmImage = gmMagick(filename);
  gmImage.background("transparent"); // Fill in new space with white background
  gmImage.gravity("NorthWest"); // Anchor image to upper-left
  gmImage.extent(width, height); // Specify new image size
  return gmImage;
}

async function checkLocalFiles(filename: string) {
  try {
    await stat(filename);
    return true;
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

const tmpName = promisify((options: TmpNameOptions, cb: TmpNameCallback) => {
  cbTmpName(options, cb);
});

export class S3Image {
  s3: S3Client;
  bucket: string | undefined;
  key: string | null | undefined;
  filePath: string;
  file: any;
  width: number | null;
  height: number | null;
  localFile: Boolean;
  protectOriginal: Boolean;
  originalFilePath: string;

  constructor({
    s3,
    bucket,
    key,
    filePath,
    width,
    height,
    localFile,
    protectOriginal,
  }: {
    s3: S3Client;
    bucket?: string;
    key?: string | undefined;
    filePath: string;
    width?: number | null;
    height?: number | null;
    localFile?: Boolean;
    protectOriginal?: Boolean;
  }) {
    this.s3 = s3;
    this.bucket = bucket;
    this.key = key;
    this.filePath = filePath;
    this.originalFilePath = filePath;
    this.width = width || null;
    this.height = height || null;
    this.localFile = localFile || false;
    this.protectOriginal = protectOriginal || false;
  }

  async download() {
    if (!this.key) {
      return;
    }

    if (!this.bucket) {
      throw new Error(`Missing bucket. Could not download file from s3.`);
    }

    this.file = await s3Download({
      s3: this.s3,
      outputPath: this.filePath,
      Bucket: this.bucket,
      Key: this.key,
    });
    const fileDownload = await checkLocalFiles(this.filePath);
    if (fileDownload) {
      this.localFile = true;
    }
  }

  setLocalFile(val: boolean) {
    this.localFile = val;
  }

  async upload() {
    if (!this.localFile) {
      throw new Error(
        `Upload can't be performed. File "${this.filePath}" does not exist.`
      );
    }

    return s3Upload({
      s3: this.s3,
      Bucket: this.bucket,
      inputPath: this.filePath,
    });
  }

  getTargetFilePath() {
    return this.filePath;
  }

  getFilePath() {
    if (!this.localFile) {
      throw new Error(
        `File "${this.filePath}" does not exist. Can't return file path.`
      );
    }

    return this.filePath;
  }

  async unlink() {
    if (
      this.localFile &&
      (!this.protectOriginal || this.originalFilePath !== this.filePath)
    ) {
      await unlink(this.filePath);
    }
    this.localFile = false;
  }

  async measureDimensions() {
    if (!this.localFile) {
      throw new Error(
        `File "${this.filePath}" does not exist. Could not measure dimensions of a missing file.`
      );
    }

    const gf = gmMagick(this.filePath);
    const dimensions = await promisify((cb: gm.GetterCallback<gm.Dimensions>) =>
      gf.size(cb)
    )();
    this.width = dimensions.width;
    this.height = dimensions.height;
  }

  async getDimensions() {
    return { width: this.width, height: this.height };
  }

  async enlarge({ width, height }: { width: number; height: number }) {
    if (!this.localFile) {
      throw new Error(
        `File "${this.filePath}" does not exist. Could not enlarge missing file.`
      );
    }

    const dimensions = await this.getDimensions();
    if (!dimensions.width || !dimensions.height) this.measureDimensions();

    if (
      this.width! > width ||
      this.height! > height ||
      (this.height === height && this.width === width)
    ) {
      return;
    }

    const tmpFilename = await tmpName({ postfix: ".png" });
    const gf = transparent(this.filePath, { width, height });
    await promisify(gf.write.bind(gf))(tmpFilename);
    if (!this.protectOriginal) await this.unlink();
    this.filePath = tmpFilename;
    await this.measureDimensions();
  }
}
