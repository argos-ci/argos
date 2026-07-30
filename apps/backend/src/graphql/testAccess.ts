import { invariant } from "@argos/util/invariant";

import { Test } from "@/database/models/Test";
import type { User } from "@/database/models/User";
import { safeParseTestId } from "@/util/test-id";

import { forbidden, notFound } from "./util";

/**
 * Resolve a test from its public GraphQL ID (e.g. `WEB-xf23d`), with its project
 * and account fetched so callers can check permissions. A malformed ID, a
 * missing test and an ID whose project doesn't match all surface as a clean
 * "not found" rather than an untyped 500.
 */
async function getTestByGraphqlId(id: string): Promise<Test> {
  const parsed = safeParseTestId(id);
  if (!parsed) {
    throw notFound("Test not found");
  }
  const test = await Test.query()
    .findById(parsed.testId)
    .withGraphFetched("project.account");
  if (!test) {
    throw notFound("Test not found");
  }
  invariant(test.project?.account, "Test project account not found");
  // The public ID embeds the project name, so a test addressed through another
  // project's ID must not resolve.
  if (test.project.name.toUpperCase() !== parsed.projectName) {
    throw notFound("Test not found");
  }
  return test;
}

/**
 * Resolve a test from its public GraphQL ID and ensure the user holds a
 * permission on its project. Used by the test comment mutations ("review") and
 * by the live activity subscription ("view"), so watching a test can never leak
 * data the user could not already read.
 */
export async function getTestForUser(input: {
  id: string;
  user: User | null;
  permission: "view" | "review";
  message: string;
}): Promise<Test> {
  const { id, user, permission, message } = input;
  const test = await getTestByGraphqlId(id);
  invariant(test.project, "Test project not fetched");
  const permissions = await test.project.$getPermissions(user);
  if (!permissions.includes(permission)) {
    throw forbidden(message);
  }
  return test;
}
