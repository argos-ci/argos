import type { ProjectEventName } from "@argos/schemas/project-event";

import { ProjectEvent } from "@/database/models";
import { isValidPgBigInt } from "@/database/util/biginteger";
import { boom } from "@/util/error";

/** How long events stay in the feed, and their deliveries with them. */
export const EVENT_RETENTION_DAYS = 7;

/**
 * Ids are allocated when an insert starts, not when it commits, so a reader
 * that sees event 11 may not see event 10 yet. The feed only reads up to the
 * newest event created at least this long ago: every id below it was
 * allocated before, and has committed since. Events must therefore never be
 * inserted inside a long transaction.
 */
const SETTLE_MS = 2_000;

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

/**
 * The newest position every reader can safely move to (see `SETTLE_MS`).
 * Shared by all projects, so a cursor taken on a quiet project skips nothing.
 */
async function getSettledHead(now: number): Promise<bigint> {
  const head = await ProjectEvent.query()
    .select("id")
    .where("createdAt", "<=", new Date(now - SETTLE_MS).toISOString())
    .orderBy("id", "desc")
    .first();
  return head ? BigInt(head.id) : 0n;
}

/**
 * Read a project's events in order, after a cursor.
 *
 * Without a cursor, the feed starts now, or `maxAgeMs` milliseconds ago.
 * With one, `maxAgeMs` only skips the events older than that.
 */
export async function listProjectEvents(args: {
  projectId: string;
  name: ProjectEventName | null;
  cursor: string | null;
  maxAgeMs: number | null;
  limit: number;
}): Promise<ProjectEventsPage> {
  const { projectId, name, maxAgeMs, limit } = args;
  const now = Date.now();
  const head = await getSettledHead(now);

  if (args.cursor === null && maxAgeMs === null) {
    return {
      events: [],
      cursor: String(head),
      truncated: false,
      hasMore: false,
    };
  }

  const cursor = args.cursor === null ? 0n : parseCursor(args.cursor);

  const query = ProjectEvent.query()
    .where("projectId", projectId)
    .where("id", ">", String(cursor))
    .where("id", "<=", String(head))
    .orderBy("id", "asc")
    .limit(limit + 1);
  if (name) {
    query.where("name", name);
  }
  if (maxAgeMs !== null) {
    query.where("createdAt", ">=", new Date(now - maxAgeMs).toISOString());
  }
  const [rows, oldest] = await Promise.all([
    query,
    ProjectEvent.query().select("id").orderBy("id", "asc").first(),
  ]);

  const events = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const last = events.at(-1);
  // A full read up to the head moves the cursor there even when nothing in
  // this project matched, so a quiet project's cursor keeps up.
  const next =
    hasMore && last ? BigInt(last.id) : head > cursor ? head : cursor;

  return {
    events,
    cursor: String(next),
    // Ids are allocated in sequence: a gap between the cursor and the oldest
    // event left means the events in between were purged.
    truncated:
      args.cursor !== null &&
      oldest !== undefined &&
      BigInt(oldest.id) > cursor + 1n,
    hasMore,
  };
}

/**
 * Delete the events older than the retention period, and their webhook
 * deliveries with them.
 */
export async function purgeProjectEvents(now: Date): Promise<void> {
  const cutoff = new Date(
    now.getTime() - EVENT_RETENTION_DAYS * 24 * 3600 * 1000,
  );
  await ProjectEvent.query()
    .where("createdAt", "<", cutoff.toISOString())
    .delete();
}
