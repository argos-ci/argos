import { UniqueViolationError } from "objection";

import { knex, transaction } from "@/database";
import {
  AuditTrail,
  IgnoredChange,
  type Project,
  type User,
} from "@/database/models";

type ChangeIdentity = {
  projectId: string;
  testId: string;
  fingerprint: string;
  userId: string;
};

/**
 * Reason a change ignore/unignore must be denied, or `null` when it is allowed.
 */
export type ChangeMutationDenial = "forbidden" | "ignore-disabled";

/**
 * Decide whether `user` may ignore/unignore changes on `project`: they need the
 * `review` permission and the project's ignore feature must be enabled. Returns
 * the denial reason, or `null` when allowed, leaving each transport (REST/GraphQL)
 * to map the reason onto its own error type.
 */
export async function getChangeMutationDenial(
  project: Project,
  user: User | null,
): Promise<ChangeMutationDenial | null> {
  const permissions = await project.$getPermissions(user);
  if (!permissions.includes("review")) {
    return "forbidden";
  }
  if (!project.$getIgnoreConfig().enabled) {
    return "ignore-disabled";
  }
  return null;
}

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

/** Identity of a change currently ignored in a project. */
export type IgnoredChangeRow = {
  testId: string;
  fingerprint: string;
};

/**
 * List the changes currently ignored in a project, most recently ignored first.
 *
 * The order can only come from `audit_trails`: `ignored_changes` is keyed by
 * (projectId, testId, fingerprint) and holds no date. A change can be ignored,
 * unignored, then ignored again, so we order on the latest `files.ignored`
 * entry. Rows with no matching entry sort last rather than dropping out.
 */
export async function queryIgnoredChanges(input: {
  projectId: string;
  after: number;
  first: number;
}): Promise<{ total: number; results: IgnoredChangeRow[] }> {
  const { projectId, after, first } = input;

  const [total, result] = await Promise.all([
    IgnoredChange.query().where("projectId", projectId).resultSize(),
    knex.raw<{ rows: IgnoredChangeRow[] }>(
      `
      SELECT
        ic."testId"::text as "testId",
        ic.fingerprint
      FROM ignored_changes ic
      LEFT JOIN LATERAL (
        SELECT atr.date
        FROM audit_trails atr
        WHERE atr."projectId" = ic."projectId"
          AND atr."testId" = ic."testId"
          AND atr.fingerprint = ic.fingerprint
          AND atr.action = 'files.ignored'
        ORDER BY atr.date DESC, atr.id DESC
        LIMIT 1
      ) trail ON true
      WHERE ic."projectId" = :projectId
      ORDER BY trail.date DESC NULLS LAST, ic."testId" DESC, ic.fingerprint DESC
      OFFSET :after
      LIMIT :first
      `,
      { projectId, after, first },
    ),
  ]);

  return { total, results: result.rows };
}
