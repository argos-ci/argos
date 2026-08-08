import { isVideoMediaContentType } from "@argos/schemas/media";
import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Media } from "./Media";
import { User } from "./User";

/**
 * One upload of a {@link Media}: the bytes, and everything read off them.
 *
 * Re-uploading the same screenshot on the same pull request adds a version rather
 * than overwriting one, so the share URL keeps showing the newest image while the
 * version a reviewer commented on is still there to compare against.
 *
 * Argos never rewrites the bytes it was given. The image CDN in front of the
 * bucket derives WebP/AVIF variants and video poster frames on request, so there
 * is no processing state here and `key` is stable for the row's whole life.
 */
export class MediaVersion extends Model {
  static override tableName = "media_versions";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object" as const,
        required: ["mediaId", "number", "key", "mimeType", "sizeBytes"],
        properties: {
          mediaId: { type: "string" },
          number: { type: "number", minimum: 1 },
          createdByUserId: { type: ["string", "null"] },
          key: { type: "string" },
          mimeType: { type: "string" },
          // A bigint column: Objection hands it back as a string, and every
          // writer passes one, so the schema accepts only strings — a union here
          // trips ajv's strict mode.
          sizeBytes: { type: "string" },
          width: { type: ["number", "null"], minimum: 0 },
          height: { type: ["number", "null"], minimum: 0 },
          expiresAt: { type: ["string", "null"] },
          uploadedAt: { type: ["string", "null"] },
          billedUnits: { type: "number", minimum: 0 },
        },
      },
    ],
  };

  static override get relationMappings(): RelationMappings {
    return {
      media: {
        relation: Model.BelongsToOneRelation,
        modelClass: Media,
        join: { from: "media_versions.mediaId", to: "media.id" },
      },
      createdBy: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: { from: "media_versions.createdByUserId", to: "users.id" },
      },
    };
  }

  mediaId!: string;
  /** 1-based, and what the UI calls the version. */
  number!: number;
  createdByUserId!: string | null;
  key!: string;
  mimeType!: string;
  /** A bigint column, so it arrives as a string. Use {@link size}. */
  sizeBytes!: string;
  width!: number | null;
  height!: number | null;
  expiresAt!: string | null;
  uploadedAt!: string | null;
  billedUnits!: number;

  media?: Media;
  createdBy?: User | null;

  /** Size in bytes, as a number. */
  get size(): number {
    return Number(this.sizeBytes);
  }

  /** Check if this version is a video. */
  isVideo(): boolean {
    return isVideoMediaContentType(this.mimeType);
  }

  /** Check if this version is an image. */
  isImage(): boolean {
    return !this.isVideo();
  }

  /**
   * Check if this version has expired. Expired versions are kept in the database
   * until the purge job runs, so this can be true for a row that still exists.
   */
  isExpired(now: Date = new Date()): boolean {
    return this.expiresAt !== null && new Date(this.expiresAt) <= now;
  }
}
