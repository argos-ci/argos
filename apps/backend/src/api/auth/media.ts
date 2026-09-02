import { invariant } from "@argos/util/invariant";

import type {
  AuthOAuthPayload,
  AuthPATPayload,
  AuthProjectPayload,
} from "@/auth/payload";
import { Media, type Project } from "@/database/models";
import { isValidPgBigInt } from "@/database/util/biginteger";
import { liveProject } from "@/media/query";
import { boom } from "@/util/error";

import { assertProjectAccess } from "./project";

/** The route params addressing a media. */
export type MediaRouteParams = {
  mediaId: string;
};

/**
 * Load the media addressed by `/media/{mediaId}`, enforcing the same rule as the
 * project routes: the token must reach the project the media belongs to.
 *
 * A media is addressed by its own id rather than nested under a project path,
 * because that is the id a share URL and a pull request comment hand back — the
 * caller has the media, not the project. The project comes back with it so
 * callers can authorize and serialize without a second round trip.
 */
export async function loadMediaForAuth<
  TAuth extends AuthPATPayload | AuthProjectPayload | AuthOAuthPayload,
>(
  authPromise: Promise<TAuth>,
  params: MediaRouteParams,
): Promise<{ auth: TAuth; media: Media; project: Project }> {
  const [auth, media] = await Promise.all([
    authPromise,
    isValidPgBigInt(params.mediaId)
      ? Media.query()
          .findById(params.mediaId)
          .whereExists(liveProject())
          .withGraphFetched("project.account")
      : null,
  ]);

  invariant(
    !media || media.project?.account,
    "Media project account not fetched",
  );

  assertProjectAccess(auth, {
    projectId: media?.projectId ?? null,
    // A media id carries no account, so the scope check uses the account the
    // media actually belongs to. A token not scoped to it fails the same way a
    // missing media does.
    account: { id: media?.project?.account?.slug ?? "" },
  });

  if (!media) {
    throw boom(404, "Not found");
  }

  invariant(media.project?.account, "Media project account not found");

  return { auth, media, project: media.project };
}
