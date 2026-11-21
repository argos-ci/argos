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
