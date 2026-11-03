import { invariant } from "@argos/util/invariant";

import type {
  AuthOAuthPayload,
  AuthPATPayload,
  AuthProjectPayload,
} from "@/auth/payload";
import { Test, type Project } from "@/database/models";
import { boom } from "@/util/error";
import { safeParseTestId } from "@/util/test-id";

import {
  assertProjectAccess,
  assertProjectPermission,
  type ProjectAccess,
} from "./project";

export const VIEW_TEST_ACCESS: ProjectAccess = {
  permission: "view",
  message: "You do not have permission to view this test",
};

/** The route params addressing a test. */
export type TestRouteParams = {
  owner: string;
  project: string;
  testId: string;
};

/**
 * Load the test addressed by `{owner}/{project}/tests/{testId}`, with the same
 * rules as `getProjectForAuth`: the token must be scoped to the owner account,
 * the test must exist, and the user must hold `access` on its project. The
 * public test id embeds the project name, so a test addressed through another
 * project's id resolves to a 404.
 */
export async function loadTestForAuth<
  TAuth extends AuthPATPayload | AuthProjectPayload | AuthOAuthPayload,
>(
  authPromise: Promise<TAuth>,
  params: TestRouteParams,
  access: ProjectAccess | null,
): Promise<{ auth: TAuth; test: Test; project: Project }> {
  const parsed = safeParseTestId(params.testId);
  const [auth, test] = await Promise.all([
    authPromise,
    parsed
      ? Test.query()
          .joinRelated("project.account")
          .where("tests.id", parsed.testId)
          .where("project:account.slug", params.owner)
          .where("project.name", params.project)
          .whereNull("project.deletedAt")
          .withGraphFetched("project.account")
          .first()
      : null,
  ]);

  assertProjectAccess(auth, {
    projectId: test?.projectId ?? null,
    account: { slug: params.owner },
  });

  if (!test || test.project?.name.toUpperCase() !== parsed?.projectName) {
    throw boom(404, "Not found");
  }

  invariant(test.project?.account, "Test project account not found");

  await assertProjectPermission(auth, test.project, access);

  return { auth, test, project: test.project };
}
