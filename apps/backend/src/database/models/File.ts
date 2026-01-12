import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";

export class File extends Model {
  static override tableName = "files";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["key", "type", "contentType"],
        properties: {
          key: { type: ["string"] },
          width: { type: ["number", "null"], minimum: 0 },
          height: { type: ["number", "null"], minimum: 0 },
          type: {
            type: "string",
            enum: ["screenshot", "screenshotDiff", "playwrightTrace"],
          },
          contentType: { type: "string" },
          fingerprint: { type: ["string", "null"] },
        },
      },
    ],
  };

  key!: string;
  width!: number | null;
  height!: number | null;
  type!: "screenshot" | "screenshotDiff" | "playwrightTrace";
  contentType!: string | null;
  /**
   * Fingerprint of the diff mask, like a "blurred" hash.
   * Only filled for type "screenshotDiff"
   */
  fingerprint!: string | null;

  /**
   * Check if the file is an image.
   */
  isImage() {
    return (
      (this.type === "screenshot" || this.type === "screenshotDiff") &&
      (!this.contentType || this.contentType.startsWith("image/"))
    );
  }

  /**
   * Check if the file is a sized image.
   */
  isSizedImage(): this is File & { width: number; height: number } {
    return this.isImage() && this.width != null && this.height != null;
  }
}
