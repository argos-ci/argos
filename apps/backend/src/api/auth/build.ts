import { invariant } from "@argos/util/invariant";

import type {
  AuthOAuthPayload,
  AuthPATPayload,
  AuthProjectPayload,
} from "@/auth/payload";
import { Build, type Project } from "@/database/models";
import { boom } from "@/util/error";

import {
  assertProjectAccess,
  assertProjectPermission,
  type ProjectAccess,
} from "./project";

export const VIEW_BUILD_ACCESS: ProjectAccess = {
  permission: "view",
  message: "You do not have permission to view this build",
};

/**
 * Load the build addressed by `{owner}/{project}/builds/{buildNumber}`, with
 * the same rules as `getProjectForAuth`: the token must be scoped to the owner
 * account, the build must exist, and the user must hold `access` on its
 * project. Pass `req.ctx.auth()` and the build load runs in parallel with
 * authentication.
 *
 * The project comes back with its account fetched, so callers can serialize
 * without a second round-trip.
 */
export async function loadBuildForAuth<
  TAuth extends AuthPATPayload | AuthProjectPayload | AuthOAuthPayload,
>(
  authPromise: Promise<TAuth>,
  params: { owner: string; project: string; buildNumber: number },
  access: ProjectAccess | null,
): Promise<{ auth: TAuth; build: Build; project: Project }> {
  const [auth, build] = await Promise.all([
    authPromise,
    Build.query()
      .joinRelated("project.account")
      .where("project:account.slug", params.owner)
      .where("project.name", params.project)
      // A deleted project answers 404 rather than 403: the route is addressed
      // by name, and that name is no longer this project's — deleting it parks
      // the project under a prefixed one.
      .whereNull("project.deletedAt")
      .where("number", params.buildNumber)
      .withGraphFetched("project.account")
      .first(),
  ]);

  assertProjectAccess(auth, {
    projectId: build?.projectId ?? null,
    account: { slug: params.owner },
  });

  if (!build) {
    throw boom(404, "Not found");
  }

  invariant(build.project?.account, "Build project account not found");

  await assertProjectPermission(auth, build.project, access);

  return { auth, build, project: build.project };
}
