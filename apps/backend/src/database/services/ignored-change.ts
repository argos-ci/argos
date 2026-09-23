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

/** How the changes ignored in a project are listed. */
export type IgnoredChangesOrder = {
  /**
   * When the change was last ignored, how many times it came back since, or
   * when it last appeared in a build.
   */
  key: "ignoredAt" | "occurrences" | "lastSeen";
  direction: "asc" | "desc";
};

/**
 * What each ordering sorts on, ahead of the tie-breakers they all share.
 *
 * Occurrences and last seen have no column to read: each is computed by a
 * lateral join, added only for the ordering that sorts on it, because the sort
 * runs over every change ignored in the project rather than over one page.
 * Both restate the query of the loader that displays the figure —
 * `ChangeOccurrencesSinceLoader` and `LatestChangeDiffLoader` — so the list
 * never reads out of order.
 */
const ORDERINGS: Record<
  IgnoredChangesOrder["key"],
  { join: string; columns: string[] }
> = {
  ignoredAt: { join: "", columns: ["trail.date"] },
  occurrences: {
    join: `
      LEFT JOIN LATERAL (
        SELECT coalesce(sum(tsf.value), 0) AS total
        FROM test_stats_fingerprints tsf
        WHERE tsf."testId" = ic."testId"
          AND tsf.fingerprint = ic.fingerprint
          AND tsf.date >= trail.date
      ) occurrences ON true
    `,
    columns: ["occurrences.total", "trail.date"],
  },
  lastSeen: {
    join: `
      LEFT JOIN LATERAL (
        SELECT sd."createdAt"
        FROM screenshot_diffs sd
        WHERE sd."testId" = ic."testId"
          AND sd.fingerprint = ic.fingerprint
          AND sd."fileId" IS NOT NULL
        ORDER BY sd.id DESC
        LIMIT 1
      ) last_seen ON true
    `,
    columns: [`last_seen."createdAt"`, "trail.date"],
  },
};

/**
 * List the changes currently ignored in a project.
 *
 * The ignore date can only come from `audit_trails`: `ignored_changes` is keyed
 * by (projectId, testId, fingerprint) and holds no date. A change can be
 * ignored, unignored, then ignored again, so it is read from the latest
 * `files.ignored` entry. Rows with no matching entry are kept, with no date.
 */
export async function queryIgnoredChanges(input: {
  projectId: string;
  orderBy: IgnoredChangesOrder;
  after: number;
  first: number;
}): Promise<{ total: number; results: IgnoredChangeRow[] }> {
  const { projectId, orderBy, after, first } = input;
  const { join, columns } = ORDERINGS[orderBy.key];
  // A missing date sorts as the oldest whichever way the list runs: its row
  // reads "Unknown date" or "Never", which comes after every real date in a
  // most-recent-first list. The tie-breakers follow the direction as well, so
  // flipping an ordering reverses the list exactly.
  const direction =
    orderBy.direction === "asc" ? "ASC NULLS FIRST" : "DESC NULLS LAST";
  const orderByClause = [...columns, `ic."testId"`, "ic.fingerprint"]
    .map((column) => `${column} ${direction}`)
    .join(", ");

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
      ${join}
      WHERE ic."projectId" = :projectId
      ORDER BY ${orderByClause}
      OFFSET :after
      LIMIT :first
      `,
      { projectId, after, first },
    ),
  ]);

  return { total, results: result.rows };
}
