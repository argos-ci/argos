import { invariant } from "@argos/util/invariant";

import type { AuthViewer } from "@/auth/payload";
import { Build } from "@/database/models/Build";

import { forbidden, notFound } from "./util";

/**
 * Ensure the user is allowed to watch a build's live activity. Subscribing to
 * a build's comments or reviews requires the same "view" permission as loading
 * the build, so a subscription can never leak data the user could not already
 * read. Authorize before opening the stream so an unpermitted subscription is
 * rejected upfront rather than after the first event.
 */
export async function assertCanViewBuild(
  buildId: string,
  auth: AuthViewer | null,
): Promise<void> {
  const build = await Build.query()
    .findById(buildId)
    .withGraphFetched("project.account");
  if (!build) {
    throw notFound("Build not found");
  }
  invariant(build.project?.account, "Build project account not found");
  const permissions = await build.project.$getPermissions(auth);
  if (!permissions.includes("view")) {
    throw forbidden("You cannot view this build");
  }
}
