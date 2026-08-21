import type { User } from "@/database/models";

/**
 * Whether the Cursor Origin integration is available to a user.
 *
 * The integration is merged but not released: staff-only, so it can be
 * exercised against the real Origin API without being offered to users. Every
 * entry point that discovers, links or imports an Origin repository goes
 * through here, so releasing it is deleting this function and its call sites.
 *
 * Not a gate on the pipeline. A project a staff member has already linked keeps
 * getting its check runs, its comments and its builds, whoever pushed the
 * commit — the webhook and the install callback are server-to-server and stay
 * open, and the install URL they depend on is only reachable through the
 * resolvers below.
 */
export function checkOriginEnabled(user: User | null | undefined): boolean {
  return Boolean(user?.staff);
}
