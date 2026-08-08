import {
  isVideoMediaContentType,
  MediaVisibilitySchema,
  type MediaVisibility,
} from "@argos/schemas/media";
import type { JSONSchema, RelationMappings } from "objection";

import { getMediaShareUrl } from "@/media/url";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Build } from "./Build";
import { GithubPullRequest } from "./GithubPullRequest";
import { Project } from "./Project";
import { ScreenshotDiff } from "./ScreenshotDiff";
import { User } from "./User";

/**
 * A standalone image or video: uploaded on its own, reachable at a share URL
 * that can be embedded in a pull request.
 *
 * Scoped to a project, exactly like a build — so it inherits project
 * permissions, project transfer and project deletion, and bills through the
 * project's account.
 *
 * Not a {@link Screenshot}: nothing compares it to a baseline, and it has no
 * bucket and no build. It shares only the storage bucket.
 *
 * Argos never rewrites the bytes it was given. The image CDN in front of the
 * bucket derives WebP/AVIF variants and video poster frames on request, so there
 * is no processing state here and `key` is stable for the row's whole life.
 */
export class Media extends Model {
  static override tableName = "media";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object" as const,
        required: [
          "projectId",
          "name",
          "key",
          "mimeType",
          "sizeBytes",
          "visibility",
          "shareToken",
        ],
        properties: {
          projectId: { type: "string" },
          githubPullRequestId: { type: ["string", "null"] },
          buildId: { type: ["string", "null"] },
          screenshotDiffId: { type: ["string", "null"] },
          createdByUserId: { type: ["string", "null"] },
          name: { type: "string", maxLength: 255 },
          slug: { type: ["string", "null"], maxLength: 255 },
          key: { type: "string" },
          mimeType: { type: "string" },
          // A bigint column: Objection hands it back as a string, and every
          // writer passes one, so the schema accepts only strings — a union here
          // trips ajv's strict mode.
          sizeBytes: { type: "string" },
          width: { type: ["number", "null"], minimum: 0 },
          height: { type: ["number", "null"], minimum: 0 },
          visibility: MediaVisibilitySchema.toJSONSchema() as JSONSchema,
          shareToken: { type: "string" },
          expiresAt: { type: ["string", "null"] },
          uploadedAt: { type: ["string", "null"] },
          billedUnits: { type: "number", minimum: 0 },
        },
      },
    ],
  };

  static override get relationMappings(): RelationMappings {
    return {
      project: {
        relation: Model.BelongsToOneRelation,
        modelClass: Project,
        join: { from: "media.projectId", to: "projects.id" },
      },
      githubPullRequest: {
        relation: Model.BelongsToOneRelation,
        modelClass: GithubPullRequest,
        join: {
          from: "media.githubPullRequestId",
          to: "github_pull_requests.id",
        },
      },
      build: {
        relation: Model.BelongsToOneRelation,
        modelClass: Build,
        join: { from: "media.buildId", to: "builds.id" },
      },
      screenshotDiff: {
        relation: Model.BelongsToOneRelation,
        modelClass: ScreenshotDiff,
        join: { from: "media.screenshotDiffId", to: "screenshot_diffs.id" },
      },
      createdBy: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: { from: "media.createdByUserId", to: "users.id" },
      },
    };
  }

  static override virtualAttributes = ["url"];

  projectId!: string;
  githubPullRequestId!: string | null;
  buildId!: string | null;
  screenshotDiffId!: string | null;
  createdByUserId!: string | null;
  name!: string;
  slug!: string | null;
  key!: string;
  mimeType!: string;
  /** A bigint column, so it arrives as a string. Use {@link size}. */
  sizeBytes!: string;
  width!: number | null;
  height!: number | null;
  visibility!: MediaVisibility;
  shareToken!: string;
  expiresAt!: string | null;
  uploadedAt!: string | null;
  billedUnits!: number;

  project?: Project;
  githubPullRequest?: GithubPullRequest | null;
  build?: Build | null;
  screenshotDiff?: ScreenshotDiff | null;
  createdBy?: User | null;

  /** The share page URL, the one that goes into a pull request. */
  get url(): string {
    return getMediaShareUrl(this.shareToken);
  }

  /** Size in bytes, as a number. */
  get size(): number {
    return Number(this.sizeBytes);
  }

  /** Check if the media is a video. */
  isVideo(): boolean {
    return isVideoMediaContentType(this.mimeType);
  }

  /** Check if the media is an image. */
  isImage(): boolean {
    return !this.isVideo();
  }

  /**
   * Check if the media has expired. Expired media is kept in the database until
   * the purge job runs, so this can be true for a row that still exists.
   */
  isExpired(now: Date = new Date()): boolean {
    return this.expiresAt !== null && new Date(this.expiresAt) <= now;
  }
}
