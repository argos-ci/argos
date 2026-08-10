import type { MediaVisibility } from "@argos/schemas/media";

import type { Account } from "@/database/models";
import { Plan } from "@/database/models";

/**
 * What an account is allowed to do with standalone media.
 *
 * Volume is *not* limited here: uploads draw from the same screenshot pool the
 * account already pays for, so the existing capacity and spend-limit checks are
 * what stop an account that has run out. What the tier gates is **retention and
 * privacy** — the two things a free CLI hosting bytes on GitHub structurally
 * cannot offer.
 */
export type MediaLimits = {
  /** Largest single file accepted, in bytes. Enforced by S3 before bytes land. */
  maxFileBytes: number;
  /**
   * How long a version is kept, in days.
   *
   * The plan's, not the caller's: retention is what the tier sells, and letting
   * an upload name its own would make the promise a per-request detail nobody
   * can reason about — including the account paying for it.
   */
  retentionDays: number;
  /** Visibilities the caller may choose from. */
  allowedVisibilities: MediaVisibility[];
  /** Visibility applied when the caller doesn't choose one. */
  defaultVisibility: MediaVisibility;
};

const HOBBY_LIMITS: MediaLimits = {
  maxFileBytes: 50 * 1024 * 1024,
  retentionDays: 30,
  // Public-only on purpose: a team-scoped link is the paid wedge. It also keeps
  // the free tier usable for its actual job — reviewers of a pull request who
  // have never heard of Argos can still open the link.
  allowedVisibilities: ["public"],
  defaultVisibility: "public",
};

const PRO_LIMITS: MediaLimits = {
  maxFileBytes: 500 * 1024 * 1024,
  retentionDays: 365,
  allowedVisibilities: ["team", "public"],
  // Private by default. Uploading a screenshot of a private product must not
  // make it world-readable, which is exactly what every free alternative does.
  defaultVisibility: "team",
};

/**
 * Resolve the media limits for an account.
 *
 * Derived from the plan rather than from columns of its own: there is nothing to
 * seed, nothing to keep in sync with Stripe, and a plan change moves an account's
 * limits the moment it takes effect.
 */
export async function getMediaLimits(account: Account): Promise<MediaLimits> {
  const plan = await account.$getSubscriptionManager().getPlan();
  if (!plan || Plan.checkIsFreePlan(plan)) {
    return HOBBY_LIMITS;
  }
  return PRO_LIMITS;
}

/**
 * Resolve the expiry date for a new media.
 *
 * The countdown runs from upload, not from last view: a media that a pull request
 * still links to would otherwise be kept alive by crawlers, and "this link works
 * for 30 days" is a promise a caller can reason about while "30 days after
 * whenever someone last looked" is not.
 */
export function resolveExpiresAt(args: {
  limits: MediaLimits;
  now?: Date;
}): Date {
  const { limits } = args;
  const now = args.now ?? new Date();
  const expiresAt = new Date(now);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + limits.retentionDays);
  return expiresAt;
}
