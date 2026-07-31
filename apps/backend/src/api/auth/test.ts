import { invariant } from "@argos/util/invariant";

import type {
  AuthOAuthPayload,
  AuthPATPayload,
  AuthProjectPayload,
} from "@/auth/payload";
import { Test, type Project } from "@/database/models";
import { boom } from "@/util/error";
import { safeParseTestId } from "@/util/test-id";

import { assertProjectAccess } from "./project";

/** The route params addressing a test. */
export type TestRouteParams = {
  owner: string;
  project: string;
  testId: string;
};

/**
 * Load the test addressed by `{owner}/{project}/tests/{testId}`, with the same
 * rules as `getProjectForAuth`: the token must be scoped to the owner account
 * and the test must exist. The public test id embeds the project name, so a test
 * addressed through another project's id resolves to a 404.
 */
export async function loadTestForAuth<
  TAuth extends AuthPATPayload | AuthProjectPayload | AuthOAuthPayload,
>(
  authPromise: Promise<TAuth>,
  params: TestRouteParams,
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

  return { auth, test, project: test.project };
}
