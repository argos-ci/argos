/* eslint-disable import/namespace */
import { spawn } from "child_process";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import type { S3Image } from "@argos-ci/storage";

export const handleRaw = (diff: {
  raw: string;
  width: number;
  height: number;
}) => {
  const matches = diff.raw.match(/all: (.+)\n/);
  if (!matches) {
    throw new Error(`Expected raw to contain 'all' but received "${diff.raw}"`);
  }
  return {
    width: diff.width,
    height: diff.height,
    value: parseFloat(matches[1] as string),
  };
};

const getDiffArgs = ({
  baseImageFilePath,
  compareImageFilePath,
  diffImageFilename,
  highlightColor,
  lowlightColor,
  fuzz,
}: {
  baseImageFilePath: string;
  compareImageFilePath: string;
  diffImageFilename: string;
  highlightColor: string;
  lowlightColor: string;
  fuzz: string | number;
}) => {
  const diffArgs = [
    "-verbose",
    "-highlight-color",
    highlightColor,
    "-lowlight-color",
    lowlightColor,
    "-compose",
    "src",
    // http://legacy.imagemagick.org/script/command-line-options.php#metric
    // http://www.imagemagick.org/Usage/compare/
    // https://github.com/ImageMagick/ImageMagick/blob/master/MagickCore/compare.c
    "-metric",
    "AE",
  ];

  if (fuzz) {
    diffArgs.push("-fuzz", String(fuzz));
  }

  diffArgs.push(
    baseImageFilePath,
    compareImageFilePath,
    // If there is no output image, then output to `stdout` (which is ignored)
    diffImageFilename || "-"
  );
  return diffArgs;
};

const createDifference = async (options: {
  baseImageFilePath: string;
  compareImageFilePath: string;
  diffImageFilename: string;
  highlightColor: string;
  lowlightColor: string;
  fuzz: string | number;
}) => {
  const diffArgs = getDiffArgs(options);

  return new Promise<string>((resolve, reject) => {
    // http://www.imagemagick.org/script/compare.php
    const proc = spawn("compare", diffArgs);
    let stderr = "";
    proc.stderr.on("data", (data) => {
      stderr += data;
    });
    proc.on("close", (code) => {
      // ImageMagick returns err code 2 if err, 0 if similar, 1 if dissimilar
      if (code === 0 || code === 1) {
        resolve(stderr);
        return;
      }
      reject(stderr);
    });
  });
};

async function getMaxDimensions(images: S3Image[]) {
  const imagesDimensions = await Promise.all(
    images.map(async (image) => {
      const { width, height } = await image.getDimensions();
      if (!width || !height) await image.measureDimensions();
      return image.getDimensions();
    })
  );

  return {
    width: Math.max(
      ...(imagesDimensions.map(({ width }) => width).filter(Number) as [number])
    ),
    height: Math.max(
      ...(imagesDimensions.map(({ height }) => height).filter(Number) as [
        number
      ])
    ),
  };
}

export default async function imageDifference(optionsWithoutDefault: {
  baseImage: S3Image;
  compareImage: S3Image;
  diffImage: S3Image;
  highlightColor?: string;
  lowlightColor?: string;
  fuzz?: string | number;
}) {
  const {
    baseImage,
    compareImage,
    diffImage,
    highlightColor = "red",
    lowlightColor = "none",
    fuzz = "0",
  } = optionsWithoutDefault;

  const [maxDimensions] = await Promise.all([
    getMaxDimensions([baseImage, compareImage]),
    mkdir(dirname(diffImage.getTargetFilePath()), { recursive: true }),
  ]);

  // Resize images to the maximum dimensions
  await Promise.all([
    baseImage.enlarge(maxDimensions),
    compareImage.enlarge(maxDimensions),
  ]);

  // Create difference
  const raw = await createDifference({
    highlightColor,
    lowlightColor,
    fuzz,
    baseImageFilePath: baseImage.getFilePath(),
    compareImageFilePath: compareImage.getFilePath(),
    diffImageFilename: diffImage.getTargetFilePath(),
  });
  diffImage.setLocalFile(true);

  return handleRaw({ ...maxDimensions, raw });
}
