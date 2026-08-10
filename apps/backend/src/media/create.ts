import type { MediaState, MediaVisibility } from "@argos/schemas/media";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

import config from "@/config";
import { isUniqueViolationError } from "@/database/error";
import { Account, Media, MediaVersion, Project } from "@/database/models";
import { generateRandomString } from "@/database/services/crypto";
import { checkIsBlockedBySpendLimit } from "@/database/services/spend-limit";
import { getS3Client } from "@/storage/s3";
import { endTrialToUnlockUsage } from "@/stripe";
import { boom } from "@/util/error";
import { redisLock } from "@/util/redis";

import { finalizeMedia } from "./finalize";
import { getMediaKey } from "./key";
import { getMediaLimits, resolveExpiresAt, type MediaLimits } from "./limits";
import { headMediaObject } from "./object";

/** How long a signed upload target stays valid. */
const UPLOAD_EXPIRES_IN_SECONDS = 1800; // 30 minutes

/**
 * Length of the share token, in characters of {@link generateRandomString}'s
 * alphabet (~5.1 bits each, so ~100 bits): unguessable is the *only* thing
 * protecting a public share URL, so this stays far past what a rate limiter
 * would need to make enumeration hopeless. Alphanumeric and this short on
 * purpose — the URL is pasted into pull requests and chat messages, and
 * base64url's `-`/`_` break double-click selection and word wrapping.
 */
const SHARE_TOKEN_LENGTH = 20;

function generateShareToken(): string {
  return generateRandomString(SHARE_TOKEN_LENGTH);
}

export type CreateMediaParams = {
  /** The project the media belongs to. Media is scoped exactly like a build. */
  project: Project;
  /** The project's account, for the plan limits and the quota checks. */
  account: Account;
  /** The acting user, when the caller holds a user token. */
  userId: string | null;
  /**
   * The media's name, and part of its identity. Uploading the same name again on
   * the same pull request adds a version.
   */
  name: string;
  /** Which half of a before/after pair this is, if it is half of one. */
  state: MediaState | null;
  /** Prose shown under the media in the managed pull request comment. */
  description: string | null;
  /**
   * The pull request this media belongs to, already resolved. Part of the
   * identity: the same name on another pull request is a different media.
   */
  githubPullRequestId: string | null;
  /**
   * Branch this media was uploaded for. Without a pull request it is what the
   * media is attached to, and the media is a draft waiting for one to open.
   */
  branch: string | null;
  contentType: string;
  /** Size the caller says the file is, enforced by S3 on upload. */
  sizeBytes: number;
  /** SHA-256 of the file contents, hex encoded. Makes the key content-addressed. */
  hash: string;
  visibility: MediaVisibility | null;
};

export type CreateMediaResult = {
  media: Media;
  /** The version the caller is uploading, or the existing one it matched. */
  version: MediaVersion;
  /** Where to POST the bytes. */
  upload: {
    url: string;
    fields: Record<string, string>;
  } | null;
};

/**
 * Register a media and hand back a signed target to upload its bytes to.
 *
 * The row exists before the bytes do, so the share URL is known up front and the
 * caller can print it (or paste it into a pull request) without waiting for a
 * 500 MB video to finish uploading. It only becomes serveable once
 * {@link finalizeMedia} confirms the object landed.
 */
export async function createMedia(
  params: CreateMediaParams,
): Promise<CreateMediaResult> {
  const { account } = params;

  await assertAccountCanUpload(account);

  const limits = await getMediaLimits(account);

  assertWithinFileSizeLimit({ sizeBytes: params.sizeBytes, limits });
  const visibility = resolveVisibility({
    requested: params.visibility,
    limits,
  });

  const key = getMediaKey({
    projectId: params.project.id,
    hash: params.hash,
    contentType: params.contentType,
  });
  const expiresAt = resolveExpiresAt({ limits });

  const { media, version } = await upsertMediaVersion({
    ...params,
    key,
    visibility,
    expiresAt,
  });

  if (version.uploadedAt) {
    return { media, version, upload: null };
  }

  // The key is content-addressed, so bytes uploaded once — by this media or by
  // any earlier one — are already in the bucket. Re-running the same command
  // then costs one HEAD instead of re-transferring a 500 MB video.
  const existingObject = await headMediaObject(key);
  if (existingObject) {
    return { media, version: await finalizeMedia(version), upload: null };
  }

  const upload = await createUploadTarget({
    key,
    contentType: params.contentType,
    maxBytes: limits.maxFileBytes,
  });

  return { media, version, upload };
}

/**
 * Find or create the media this upload belongs to, and give it a version.
 *
 * Identity is `(project, pull request, name, state)`. Uploading a name that is
 * already there adds a version rather than overwriting one, which is what keeps a
 * share URL — and any Markdown embed already posted to a pull request — pointing
 * at the newest image while the version a reviewer commented on survives.
 *
 * Byte-identical to the current version is *not* a new version: a CI job that
 * re-runs without the screenshot changing would otherwise stack identical
 * versions and bill for each one.
 */
async function upsertMediaVersion(
  params: CreateMediaParams & {
    key: string;
    visibility: MediaVisibility;
    expiresAt: Date;
  },
): Promise<{ media: Media; version: MediaVersion }> {
  const {
    project,
    githubPullRequestId,
    branch,
    name,
    state,
    description,
    key,
    visibility,
    expiresAt,
  } = params;

  // Mirrors `media_identity_unique` exactly: the pull request when there is one,
  // the branch otherwise. It has to, or two uploads that collide on the index
  // take two different locks and neither blocks the other.
  //
  // The lock alone is still not enough, because the *lookup* is wider than the
  // index — an upload naming only a branch can resolve to a media that has since
  // been published, whose key is `pr:…`. So a create that loses that race is
  // caught below and retried rather than surfacing the constraint violation.
  const attachment = githubPullRequestId
    ? `pr:${githubPullRequestId}`
    : `branch:${branch ?? ""}`;

  // Two agents racing on the same identity — a re-run of the same CI job, say —
  // must not both insert: `media_identity_unique` would reject one of them with a
  // constraint violation rather than a usable answer, and the version number is
  // read-then-written so it needs serializing too.
  return redisLock.acquire(
    ["media-identity", project.id, attachment, name, state ?? ""],
    async () => {
      const findMediaForUpload = () =>
        Media.query()
          .where({
            projectId: project.id,
            name,
            state: state ?? null,
          })
          // Two ways to be the same screenshot, and both have to match or the
          // upload creates a second media beside the one it meant to add a version
          // to. `= NULL` never matches, hence the explicit null branches.
          //
          //  - already on this pull request, which is the steady state; or
          //  - staged on this upload's branch, which is the same screenshot before
          //    the pull request existed. Its attachment is about to change, and
          //    that is the point: the media is adopted rather than duplicated.
          .where((builder) => {
            if (githubPullRequestId) {
              builder.where("githubPullRequestId", githubPullRequestId);
              if (branch) {
                builder.orWhere((staged) =>
                  staged
                    .whereNull("githubPullRequestId")
                    .where("branch", branch),
                );
              }
              return;
            }
            if (branch) {
              // Not restricted to staged media: once this branch's media is
              // published, a later upload from the same branch is a new version of
              // it, not a shadow copy the pull request will never show.
              builder.where("branch", branch);
              return;
            }
            builder.whereNull("githubPullRequestId").whereNull("branch");
          })
          // Deterministic when both match: the one already on the pull request is
          // the one the comment is built from.
          .orderByRaw('"githubPullRequestId" IS NULL, id')
          .first();

      const found = await findMediaForUpload();

      // Adoption: a media staged on the branch becomes this pull request's the
      // moment an upload names the pull request, without waiting for the branch
      // to be published.
      const existing =
        found && githubPullRequestId && !found.githubPullRequestId
          ? await found.$query().patchAndFetch({ githubPullRequestId })
          : found;

      const media = existing
        ? // The description travels with the newest upload that supplied one, so
          // re-uploading with better wording updates what the comment says.
          await existing.$query().patchAndFetch({
            visibility,
            ...(description === null ? {} : { description }),
            // A published media learns the branch it came from when a later
            // upload names one. It never loses it: identity ignores the branch
            // once a pull request is attached, so clearing it would drop
            // provenance for nothing.
            ...(branch === null ? {} : { branch }),
          })
        : await Media.query()
            .insertAndFetch({
              projectId: project.id,
              githubPullRequestId,
              branch,
              createdByUserId: params.userId,
              name,
              state,
              description,
              visibility,
              shareToken: generateShareToken(),
            })
            .catch(async (error: unknown) => {
              if (!isUniqueViolationError(error)) {
                throw error;
              }
              // Someone else created this identity under a lock we do not share
              // — the lookup spans more keys than the index does, so that is
              // reachable. The row they made is the one this upload belongs to.
              const raced = await findMediaForUpload();
              invariant(
                raced,
                "the identity was taken, so a media exists for it",
              );
              return raced;
            });

      const latest = await MediaVersion.query()
        .where("mediaId", media.id)
        .orderBy("number", "desc")
        .first();

      // Same bytes as the current version: nothing to upload, nothing to bill,
      // and nothing worth calling a new version.
      if (latest && latest.key === key && latest.uploadedAt) {
        return { media, version: latest };
      }

      // An unfinished version of the same bytes is the same attempt resumed.
      if (latest && latest.key === key) {
        return { media, version: latest };
      }

      const version = await MediaVersion.query().insertAndFetch({
        mediaId: media.id,
        number: (latest?.number ?? 0) + 1,
        createdByUserId: params.userId,
        key,
        mimeType: params.contentType,
        sizeBytes: String(params.sizeBytes),
        expiresAt: expiresAt.toISOString(),
        billedUnits: 0,
      });

      return { media, version };
    },
  );
}

/**
 * Sign a POST policy S3 itself enforces, so an oversized or mistyped upload is
 * rejected **before** the bytes reach the bucket rather than after we have paid
 * to receive them.
 */
async function createUploadTarget(args: {
  key: string;
  contentType: string;
  maxBytes: number;
}): Promise<{ url: string; fields: Record<string, string> }> {
  const { url, fields } = await createPresignedPost(getS3Client(), {
    Bucket: config.get("s3.screenshotsBucket"),
    Key: args.key,
    Expires: UPLOAD_EXPIRES_IN_SECONDS,
    Fields: { "Content-Type": args.contentType },
    Conditions: [
      ["content-length-range", 1, args.maxBytes],
      ["eq", "$Content-Type", args.contentType],
    ],
  });
  return { url, fields };
}

/**
 * Reject the upload when the account has no capacity left, reusing the checks
 * that gate build creation so media and screenshots run out together — they draw
 * on the same pool.
 */
async function assertAccountCanUpload(account: Account): Promise<void> {
  const manager = account.$getSubscriptionManager();
  const [plan, outOfCapacityReason, isBlockedBySpendLimit] = await Promise.all([
    manager.getPlan(),
    manager.checkIsOutOfCapacity(),
    checkIsBlockedBySpendLimit(account),
  ]);

  // Same gate as build creation: a team that has never subscribed (or has
  // churned) has no plan at all, and team features are not free. Someone who
  // wants the free tier uses their personal account, which is what Hobby is.
  if (account.type === "team" && !plan) {
    throw boom(
      402,
      "Upload rejected: subscribe to a Pro plan to use Team features.",
    );
  }

  switch (outOfCapacityReason) {
    case null:
      break;
    case "trialing": {
      const trialEnded = await endTrialToUnlockUsage(account);
      if (trialEnded) {
        break;
      }
      throw boom(
        402,
        `Upload rejected: you have reached the maximum screenshot capacity of your ${plan ? `${plan.displayName} Plan` : "Plan"} trial. Please upgrade your Plan.`,
      );
    }
    case "flat-rate":
      throw boom(
        402,
        `Upload rejected: you have reached the maximum screenshot capacity included in your ${plan ? `${plan.displayName} Plan` : "Plan"}. Please upgrade your Plan.`,
      );
    default:
      assertNever(outOfCapacityReason);
  }

  if (isBlockedBySpendLimit) {
    const spendLimit = account.meteredSpendLimitByPeriod;
    invariant(
      spendLimit !== null,
      "If we are over the spend limit, it should be set",
    );
    throw boom(
      402,
      "Upload rejected: you have reached the spend limit for this billing period. Ask an owner to update the limit in your Team settings.",
    );
  }
}

function assertWithinFileSizeLimit(args: {
  sizeBytes: number;
  limits: MediaLimits;
}): void {
  if (args.sizeBytes > args.limits.maxFileBytes) {
    const limitMb = Math.round(args.limits.maxFileBytes / (1024 * 1024));
    throw boom(
      413,
      `File is too large. The maximum file size on your plan is ${limitMb} MB.`,
    );
  }
}

function resolveVisibility(args: {
  requested: MediaVisibility | null;
  limits: MediaLimits;
}): MediaVisibility {
  const { requested, limits } = args;
  if (!requested) {
    return limits.defaultVisibility;
  }
  if (!limits.allowedVisibilities.includes(requested)) {
    throw boom(
      402,
      `The \`${requested}\` visibility requires a paid plan. Media uploaded on the Hobby plan is reachable by anyone holding its share URL.`,
    );
  }
  return requested;
}
