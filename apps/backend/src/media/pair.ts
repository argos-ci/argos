import { Media } from "@/database/models";

/**
 * What identifies one half of a before/after pair, so the other half can be
 * found: project, attachment, name, state.
 *
 * The same tuple `media_identity_unique` is built on, which is what guarantees
 * there is at most one counterpart.
 *
 * "Attachment" is the pull request when there is one and the branch otherwise,
 * exactly as the index computes it. Keying on the pull request alone would
 * collapse every staged media onto one empty segment, so two branches staging
 * `checkout.png` would pair across each other.
 */
export function getMediaPairKey(media: {
  projectId: string;
  githubPullRequestId: string | null;
  branch: string | null;
  name: string;
  state: string | null;
}): string {
  const attachment = media.githubPullRequestId
    ? `pr:${media.githubPullRequestId}`
    : `branch:${media.branch ?? ""}`;
  return `${media.projectId}:${attachment}:${media.name}:${media.state}`;
}

/** The opposite half of a pair, as a state. */
export function getOppositeMediaState(state: "before" | "after") {
  return state === "before" ? ("after" as const) : ("before" as const);
}

/**
 * The other half of this media's before/after pair, or null when it stands
 * alone or its other half has not been uploaded yet.
 *
 * The single-media form of {@link getMediaPairKey}, expressed as a query rather
 * than a lookup table — the batched version lives in the GraphQL loader, and
 * both derive the pair from the same tuple so they cannot disagree.
 *
 * No permission check: this is the storage-level pairing. Anything answering a
 * viewer has to check that they may see the counterpart too.
 */
export async function findMediaCounterpart(
  media: Media,
): Promise<Media | null> {
  if (!media.state) {
    return null;
  }

  const query = Media.query().findOne({
    projectId: media.projectId,
    name: media.name,
    state: getOppositeMediaState(media.state),
  });

  if (media.githubPullRequestId) {
    query.where("githubPullRequestId", media.githubPullRequestId);
  } else {
    // `= NULL` never matches, so both null branches have to be spelled out.
    query.whereNull("githubPullRequestId");
    if (media.branch === null) {
      query.whereNull("branch");
    } else {
      query.where("branch", media.branch);
    }
  }

  return (await query) ?? null;
}
