/* eslint-disable import/namespace */
import { spawn } from "child_process";

import { tmpName } from "@argos-ci/storage";
import type { ImageFile } from "@argos-ci/storage";

const getScore = (raw: string) => {
  const matches = raw.match(/all: (.+)\n/);
  if (!matches) {
    throw new Error(`Expected raw to contain 'all' but received "${raw}"`);
  }
  return parseFloat(matches[1] as string);
};

const getDiffArgs = ({
  baseImageFilepath,
  compareImageFilepath,
  diffImageFilepath,
  highlightColor,
  lowlightColor,
  fuzz,
}: {
  baseImageFilepath: string;
  compareImageFilepath: string;
  diffImageFilepath: string;
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
    baseImageFilepath,
    compareImageFilepath,
    // If there is no output image, then output to `stdout` (which is ignored)
    diffImageFilepath || "-"
  );
  return diffArgs;
};

const createDifference = async (options: {
  baseImageFilepath: string;
  compareImageFilepath: string;
  diffImageFilepath: string;
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

async function getMaxDimensions(images: ImageFile[]) {
  const imagesDimensions = await Promise.all(
    images.map(async (image) => image.getDimensions())
  );

  return {
    width: Math.max(...imagesDimensions.map(({ width }) => width)),
    height: Math.max(...imagesDimensions.map(({ height }) => height)),
  };
}

export default async function imageDifference(optionsWithoutDefault: {
  baseImage: ImageFile;
  compareImage: ImageFile;
  highlightColor?: string;
  lowlightColor?: string;
  fuzz?: string | number;
}) {
  const {
    baseImage,
    compareImage,
    highlightColor = "red",
    lowlightColor = "none",
    fuzz = "0",
  } = optionsWithoutDefault;

  const [maxDimensions, diffImageFilepath] = await Promise.all([
    getMaxDimensions([baseImage, compareImage]),
    tmpName({ postfix: ".png" }),
  ]);

  // Resize images to the maximum dimensions
  const [baseImageFilepath, compareImageFilepath] = await Promise.all([
    baseImage.enlarge(maxDimensions),
    compareImage.enlarge(maxDimensions),
  ]);

  // Create difference
  const raw = await createDifference({
    highlightColor,
    lowlightColor,
    fuzz,
    baseImageFilepath: baseImageFilepath,
    compareImageFilepath: compareImageFilepath,
    diffImageFilepath,
  });

  return {
    ...maxDimensions,
    filepath: diffImageFilepath,
    value: getScore(raw),
  };
}
