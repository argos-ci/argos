import { UniqueViolationError } from "objection";

import { transaction } from "@/database";
import { AuditTrail, IgnoredChange } from "@/database/models";

type ChangeIdentity = {
  projectId: string;
  testId: string;
  fingerprint: string;
  userId: string;
};

/**
 * Check whether a test change (a `testId` + `fingerprint` pair) is currently
 * ignored for a project.
 */
export async function isChangeIgnored(input: {
  projectId: string;
  testId: string;
  fingerprint: string;
}): Promise<boolean> {
  const { projectId, testId, fingerprint } = input;
  const ignoredChange = await IgnoredChange.query().findOne({
    projectId,
    testId,
    fingerprint,
  });
  return Boolean(ignoredChange);
}

/**
 * Ignore a test change and record it in the audit trail. Idempotent: does
 * nothing when the change is already ignored.
 */
export async function ignoreChange(input: ChangeIdentity): Promise<void> {
  const { projectId, testId, fingerprint, userId } = input;
  if (await isChangeIgnored({ projectId, testId, fingerprint })) {
    return;
  }
  try {
    await transaction(async (trx) => {
      await Promise.all([
        IgnoredChange.query(trx).insert({ projectId, testId, fingerprint }),
        AuditTrail.query(trx).insert({
          date: new Date().toISOString(),
          projectId,
          testId,
          userId,
          fingerprint,
          action: "files.ignored",
        }),
      ]);
    });
  } catch (error) {
    // A concurrent request can ignore the same change between the check above
    // and the insert. The composite primary key rejects the duplicate; the
    // whole transaction (including the audit trail) rolls back, so the losing
    // request is a clean no-op rather than a 500.
    if (error instanceof UniqueViolationError) {
      return;
    }
    throw error;
  }
}

/**
 * Unignore a test change and record it in the audit trail. Idempotent: does
 * nothing when the change is not ignored.
 */
export async function unignoreChange(input: ChangeIdentity): Promise<void> {
  const { projectId, testId, fingerprint, userId } = input;
  if (!(await isChangeIgnored({ projectId, testId, fingerprint }))) {
    return;
  }
  await transaction(async (trx) => {
    await Promise.all([
      IgnoredChange.query(trx)
        .where({ projectId, testId, fingerprint })
        .delete(),
      AuditTrail.query(trx).insert({
        date: new Date().toISOString(),
        projectId,
        testId,
        userId,
        fingerprint,
        action: "files.unignored",
      }),
    ]);
  });
}
