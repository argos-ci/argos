import * as Sentry from "@sentry/node";
import sharp from "sharp";

/**
 * Read the metadata of an image.
 */
export async function getImageMetadata(args: { filepath: string }) {
  return Sentry.startSpan(
    {
      name: "sharp.metadata",
      op: "sharp.metadata",
      attributes: {
        "argos.image.path": args.filepath,
      },
    },
    () => sharp(args.filepath).metadata(),
  );
}

/**
 * Resize an image to the given dimensions and write it to the output path.
 */
export async function resizeImage(args: {
  inputPath: string;
  outputPath: string;
  width: number;
  height: number;
}) {
  return Sentry.startSpan(
    {
      name: "sharp.resize",
      op: "sharp.resize",
      attributes: {
        "argos.image.input_path": args.inputPath,
        "argos.image.output_path": args.outputPath,
        "argos.image.width": args.width,
        "argos.image.height": args.height,
      },
    },
    async () => {
      await sharp(args.inputPath)
        .resize({
          width: args.width,
          height: args.height,
          fit: "contain",
          position: "left top",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .toFile(args.outputPath);
    },
  );
}
