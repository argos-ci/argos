/* eslint-disable import/namespace */
import { stat, mkdir, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { spawn } from "node:child_process";
import { promisify } from "node:util";
import gm from "gm";
import { tmpName as cbTmpName } from "tmp";

const tmpName = promisify(cbTmpName);

const gmMagick = gm.subClass({ imageMagick: true });

const checkFileExists = async (filename) => {
  try {
    await stat(filename);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
};

const transparent = (filename, { width, height }) => {
  const gmImage = gmMagick(filename);
  gmImage.background("transparent"); // Fill in new space with white background
  gmImage.gravity("NorthWest"); // Anchor image to upper-left
  gmImage.extent(width, height); // Specify new image size
  return gmImage;
};

const getImageSize = async (filename) => {
  const gf = gmMagick(filename);
  return promisify(gf.size.bind(gf))();
};

export const handleRaw = (difference) => {
  const { raw, ...other } = difference;

  const matches = raw.match(/all: (.+)\n/);
  if (!matches) {
    throw new Error(`Expected raw to contain 'all' but received "${raw}"`);
  }
  return {
    ...other,
    value: parseFloat(matches[1], 10),
  };
};

const resizeImage = async (filename, { width, height }) => {
  const tmpFilename = await tmpName({ postfix: ".png" });
  const gf = transparent(filename, { width, height });
  await promisify(gf.write.bind(gf))(tmpFilename);
  return tmpFilename;
};

const getDiffArgs = ({
  actualFilename,
  expectedFilename,
  diffFilename,
  highlightColor,
  lowlightColor,
  fuzz,
}) => {
  const diffArgs = [
    "-verbose",
    "-highlight-color",
    highlightColor,
    "-lowlight-color",
    lowlightColor,
    // http://legacy.imagemagick.org/script/command-line-options.php#metric
    // http://www.imagemagick.org/Usage/compare/
    // https://github.com/ImageMagick/ImageMagick/blob/master/MagickCore/compare.c
    "-metric",
    "AE",
  ];

  if (fuzz) {
    diffArgs.push("-fuzz", fuzz);
  }

  diffArgs.push(
    actualFilename,
    expectedFilename,
    // If there is no output image, then output to `stdout` (which is ignored)
    diffFilename || "-"
  );
  return diffArgs;
};

const createDifference = async (options) => {
  const diffArgs = getDiffArgs(options);
  return new Promise((resolve, reject) => {
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

const resizeIfNecessary = async (filename, dimensions, maxDimensions) => {
  if (
    dimensions.width !== maxDimensions.width ||
    dimensions.height !== maxDimensions.height
  ) {
    return resizeImage(filename, {
      width: maxDimensions.width,
      height: maxDimensions.height,
    });
  }
  return filename;
};

export async function rawDifference(options) {
  const { actualFilename, expectedFilename, diffFilename, ...other } = options;

  // Check if files exists
  await Promise.all(
    [actualFilename, expectedFilename].map(async (filename) => {
      if (!(await checkFileExists(filename))) {
        throw new Error(`File "${filename}" does not exist`);
      }
    })
  );

  const [actualSize, expectedSize] = await Promise.all([
    getImageSize(actualFilename),
    getImageSize(expectedFilename),
    diffFilename ? mkdir(dirname(diffFilename), { recursive: true }) : null,
  ]);

  // Find the maximum dimensions
  const maxDimensions = {
    width: Math.max(actualSize.width, expectedSize.width),
    height: Math.max(actualSize.height, expectedSize.height),
  };

  // Resize images to the maximum dimensions
  const [resizedActualFilename, resizedExpectedFilename] = await Promise.all([
    resizeIfNecessary(actualFilename, actualSize, maxDimensions),
    resizeIfNecessary(expectedFilename, expectedSize, maxDimensions),
  ]);

  // Create difference
  const raw = await createDifference({
    ...other,
    actualFilename: resizedActualFilename,
    expectedFilename: resizedExpectedFilename,
    diffFilename,
  });

  // Remove temporary files
  await Promise.all([
    resizedActualFilename !== actualFilename
      ? unlink(resizedActualFilename)
      : null,
    resizedExpectedFilename !== expectedFilename
      ? unlink(resizedExpectedFilename)
      : null,
  ]);

  return { ...maxDimensions, raw };
}

export default async function imageDifference(optionsWithoutDefault) {
  const {
    actualFilename,
    expectedFilename,
    highlightColor = "red",
    lowlightColor = "white",
    fuzz = 0,
    ...other
  } = optionsWithoutDefault;

  // Assert our options are passed in
  if (!actualFilename) {
    throw new Error(
      "`options.actualFilename` was not passed to `image-difference`"
    );
  }

  if (!expectedFilename) {
    throw new Error(
      "`options.expectedFilename` was not passed to `image-difference`"
    );
  }

  const options = {
    actualFilename,
    expectedFilename,
    highlightColor,
    lowlightColor,
    fuzz,
    ...other,
  };

  const difference = await rawDifference(options);
  return handleRaw(difference, options);
}
