import {
  MediaStateSchema,
  MediaVisibilitySchema,
  type MediaState,
  type MediaVisibility,
} from "@argos/schemas/media";
import type { JSONSchema, RelationMappings } from "objection";

import { getMediaShareUrl } from "@/media/url";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Build } from "./Build";
import { GithubPullRequest } from "./GithubPullRequest";
import { MediaVersion } from "./MediaVersion";
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
 * This row is the **identity** — what the thing is a picture of — and holds no
 * bytes. Each upload is a {@link MediaVersion}. Its identity is
 * `(project, pull request, name, state)`, enforced by `media_identity_unique`, so
 * re-uploading the same screenshot on the same pull request adds a version and the
 * share URL keeps working.
 */
export class Media extends Model {
  static override tableName = "media";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object" as const,
        required: ["projectId", "name", "visibility", "shareToken"],
        properties: {
          projectId: { type: "string" },
          githubPullRequestId: { type: ["string", "null"] },
          buildId: { type: ["string", "null"] },
          screenshotDiffId: { type: ["string", "null"] },
          createdByUserId: { type: ["string", "null"] },
          name: { type: "string", maxLength: 255 },
          state: MediaStateSchema.nullable().toJSONSchema() as JSONSchema,
          description: { type: ["string", "null"] },
          visibility: MediaVisibilitySchema.toJSONSchema() as JSONSchema,
          shareToken: { type: "string" },
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
      versions: {
        relation: Model.HasManyRelation,
        modelClass: MediaVersion,
        join: { from: "media.id", to: "media_versions.mediaId" },
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
  state!: MediaState | null;
  description!: string | null;
  visibility!: MediaVisibility;
  shareToken!: string;

  project?: Project;
  githubPullRequest?: GithubPullRequest | null;
  build?: Build | null;
  screenshotDiff?: ScreenshotDiff | null;
  createdBy?: User | null;
  versions?: MediaVersion[];

  /** The share page URL, the one that goes into a pull request. */
  get url(): string {
    return getMediaShareUrl(this.shareToken);
  }
}
