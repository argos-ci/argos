import type { ProjectEventName } from "@argos/schemas/project-event";
import { addDays } from "@argos/util/date";

import { ProjectEvent } from "@/database/models";
import { isValidPgBigInt } from "@/database/util/biginteger";
import { boom } from "@/util/error";

/** How long events stay in the feed, and their deliveries with them. */
export const EVENT_RETENTION_DAYS = 7;

/** The most events one read of the feed returns. */
export const MAX_EVENTS_PER_PAGE = 100;

/** Events deleted per statement, so a purge never locks the table for long. */
const PURGE_BATCH_SIZE = 1000;

export type ProjectEventsPage = {
  events: ProjectEvent[];
  /** Pass it back to read the events that come after. */
  cursor: string;
  /** Whether events after the given cursor were purged before being read. */
  truncated: boolean;
  hasMore: boolean;
};

function parseCursor(cursor: string): bigint {
  if (!isValidPgBigInt(cursor) || BigInt(cursor) < 0n) {
    throw boom(400, "Invalid cursor. Pass the cursor of a previous response.", {
      field: "cursor",
    });
  }
  return BigInt(cursor);
}

async function getFirstId(
  order: "asc" | "desc",
  createdAfter?: Date,
): Promise<bigint | null> {
  const query = ProjectEvent.query().select("id").first();
  if (createdAfter) {
    query
      .where("createdAt", ">=", createdAfter.toISOString())
      .orderBy("createdAt", "asc");
  } else {
    query.orderBy("id", order);
  }
  const row = await query;
  return row ? BigInt(row.id) : null;
}

/**
 * Read a project's events in order, after a cursor. Events commit in id order
 * (see `sendProjectEvent`), so the newest id is a position every reader can
 * move to.
 *
 * Without a cursor, the feed starts now, or `maxAgeMs` milliseconds ago.
 * With one, `maxAgeMs` only skips the events older than that.
 */
export async function listProjectEvents(args: {
  projectId: string;
  name?: ProjectEventName | undefined;
  cursor?: string | undefined;
  maxAgeMs?: number | undefined;
  limit: number;
}): Promise<ProjectEventsPage> {
  const { projectId, name, maxAgeMs, limit } = args;
  // Capped at the retention: nothing older is kept, and a large enough age
  // would put the floor before the earliest date a `Date` can hold.
  const ageFloor =
    maxAgeMs === undefined
      ? undefined
      : new Date(
          Math.max(
            Date.now() - maxAgeMs,
            addDays(new Date(), -EVENT_RETENTION_DAYS).getTime(),
          ),
        );
  const [head, oldest, floorId] = await Promise.all([
    getFirstId("desc"),
    getFirstId("asc"),
    ageFloor ? getFirstId("asc", ageFloor) : null,
  ]);
  const headCursor = head ?? 0n;

  if (args.cursor === undefined && !ageFloor) {
    return {
      events: [],
      cursor: String(headCursor),
      truncated: false,
      hasMore: false,
    };
  }

  const cursor = args.cursor === undefined ? 0n : parseCursor(args.cursor);
  // Seeking from the oldest event young enough keeps the read on the
  // `(projectId, id)` index rather than every retained event of the project.
  const after =
    floorId !== null && floorId - 1n > cursor ? floorId - 1n : cursor;

  const query = ProjectEvent.query()
    .where("projectId", projectId)
    .where("id", ">", String(after))
    .where("id", "<=", String(headCursor))
    .orderBy("id", "asc")
    .limit(limit + 1);
  if (name) {
    query.where("name", name);
  }
  if (ageFloor) {
    query.where("createdAt", ">=", ageFloor.toISOString());
  }
  const rows = await query;

  const events = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const last = events.at(-1);
  // A full read up to the head moves the cursor there even when nothing in
  // this project matched, so a quiet project's cursor keeps up.
  const next =
    hasMore && last
      ? BigInt(last.id)
      : headCursor > cursor
        ? headCursor
        : cursor;

  return {
    events,
    cursor: String(next),
    // Ids are allocated in sequence: a gap between the cursor and the oldest
    // event left means the events in between were purged.
    truncated:
      args.cursor !== undefined && oldest !== null && oldest > cursor + 1n,
    hasMore,
  };
}

/**
 * Delete the events older than the retention period, and their webhook
 * deliveries with them.
 */
export async function purgeProjectEvents(now: Date): Promise<void> {
  const cutoff = addDays(now, -EVENT_RETENTION_DAYS).toISOString();
  for (;;) {
    const deleted = await ProjectEvent.query()
      .whereIn(
        "id",
        ProjectEvent.query()
          .select("id")
          .where("createdAt", "<", cutoff)
          .orderBy("createdAt", "asc")
          .limit(PURGE_BATCH_SIZE),
      )
      .delete();
    if (deleted < PURGE_BATCH_SIZE) {
      return;
    }
  }
}
